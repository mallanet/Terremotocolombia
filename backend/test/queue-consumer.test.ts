/**
 * Consumidor de Cloudflare Queues (lib/queue-consumer.ts) — escenarios del
 * plan U2/U3. Las funciones de consumo son puras respecto al transporte
 * (mensajes fake con ack/retry grabados); persistDeadLetter se prueba de
 * integración contra la base local.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import "./helpers"; // fija env ANTES de cargar la app / db
import { desc, eq } from "drizzle-orm";
import {
  classifyQueue,
  consumeDlqBatch,
  consumeNeedsBatch,
  persistDeadLetter,
  type IncomingQueueMessage,
} from "@/lib/queue-consumer";
import { getDb, schema } from "@/db";

interface FakeMessage extends IncomingQueueMessage {
  acked: boolean;
  retried: boolean;
}

function fakeMessage(id: string, body: unknown, attempts = 1): FakeMessage {
  const message: FakeMessage = {
    id,
    body,
    attempts,
    acked: false,
    retried: false,
    ack() {
      message.acked = true;
    },
    retry() {
      message.retried = true;
    },
  };
  return message;
}

describe("classifyQueue", () => {
  it("reconoce los cuatro nombres reales y lo desconocido", () => {
    expect(classifyQueue("terremotocolombia-needs")).toBe("needs");
    expect(classifyQueue("terremotocolombia-needs-staging")).toBe("needs");
    expect(classifyQueue("terremotocolombia-needs-dlq")).toBe("needs-dlq");
    expect(classifyQueue("terremotocolombia-needs-dlq-staging")).toBe("needs-dlq");
    expect(classifyQueue("otra-cola")).toBe("unknown");
  });
});

describe("consumeNeedsBatch", () => {
  it("un batch de uno publica y hace ack", async () => {
    const publish = vi.fn().mockResolvedValue({ ok: true });
    const markCompleted = vi.fn().mockResolvedValue(undefined);
    const message = fakeMessage("m1", {
      jobId: "need-demo-1",
      need: { title: "Demo" },
    });
    await consumeNeedsBatch(
      { queue: "terremotocolombia-needs", messages: [message] },
      { publish, markCompleted },
    );
    expect(publish).toHaveBeenCalledTimes(1);
    expect(markCompleted).toHaveBeenCalledWith("need-demo-1", { ok: true });
    expect(message.acked).toBe(true);
    expect(message.retried).toBe(false);
  });

  it("no repite una publicación completada si solo falla guardar su estado", async () => {
    const publish = vi.fn().mockResolvedValue({ id: "external-1", status: "pending" });
    const markCompleted = vi.fn().mockRejectedValue(new Error("db caída"));
    const message = fakeMessage("m-status", {
      jobId: "need-demo-status",
      need: { title: "Demo" },
    });

    await consumeNeedsBatch(
      { queue: "terremotocolombia-needs", messages: [message] },
      { publish, markCompleted },
    );

    expect(publish).toHaveBeenCalledTimes(1);
    expect(message.acked).toBe(true);
    expect(message.retried).toBe(false);
  });

  it("ack por mensaje: un fallo no reentrega a sus compañeros de lote", async () => {
    const publish = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("tercero caido"))
      .mockResolvedValueOnce({ ok: true });
    const ok1 = fakeMessage("m1", {});
    const bad = fakeMessage("m2", {});
    const ok2 = fakeMessage("m3", {});
    await consumeNeedsBatch(
      { queue: "terremotocolombia-needs", messages: [ok1, bad, ok2] },
      { publish },
    );
    expect(ok1.acked).toBe(true);
    expect(ok2.acked).toBe(true);
    expect(bad.acked).toBe(false);
    expect(bad.retried).toBe(true);
  });

  it("un fallo de publicación hace retry() en vez de lanzar el batch", async () => {
    const publish = vi.fn().mockRejectedValue(new Error("boom"));
    const message = fakeMessage("m1", {});
    await expect(
      consumeNeedsBatch({ queue: "terremotocolombia-needs", messages: [message] }, { publish }),
    ).resolves.toBeUndefined();
    expect(message.retried).toBe(true);
  });
});

describe("consumeDlqBatch", () => {
  it("persiste con cola, id, intentos y payload", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const message = fakeMessage("dead-1", { need: { title: "X" } }, 6);
    await consumeDlqBatch(
      { queue: "terremotocolombia-needs-dlq", messages: [message] },
      persist,
    );
    expect(persist).toHaveBeenCalledWith({
      queue: "terremotocolombia-needs-dlq",
      messageId: "dead-1",
      attempts: 6,
      payload: { need: { title: "X" } },
    });
    expect(message.acked).toBe(true);
  });

  it("ack INCONDICIONAL: un fallo al persistir no dead-letterea la carta muerta", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("db caida"));
    const message = fakeMessage("dead-2", {});
    await consumeDlqBatch(
      { queue: "terremotocolombia-needs-dlq", messages: [message] },
      persist,
    );
    expect(message.acked).toBe(true);
    expect(message.retried).toBe(false);
  });

  it("marca como fallido el job de necesidad cuando agota reintentos", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const onNeedDeadLetter = vi.fn().mockResolvedValue(undefined);
    const body = { jobId: "need-dead-1", need: { title: "Demo" } };
    const message = fakeMessage("dead-need", body, 6);

    await consumeDlqBatch(
      { queue: "terremotocolombia-needs-dlq", messages: [message] },
      persist,
      { onNeedDeadLetter },
    );

    expect(onNeedDeadLetter).toHaveBeenCalledWith(body);
    expect(message.acked).toBe(true);
  });
});

describe("persistDeadLetter (integración)", () => {
  beforeAll(async () => {
    const { ensureSeed } = await import("./helpers");
    await ensureSeed();
  });

  it("escribe la carta muerta en audit_log con action queue.dead_letter", async () => {
    const messageId = `test-dead-${Date.now()}`;
    await persistDeadLetter({
      queue: "terremotocolombia-needs-dlq-staging",
      messageId,
      attempts: 6,
      payload: { need: { title: "DEMO carta muerta" } },
    });
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.action, "queue.dead_letter"))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(5);
    const mine = rows.find(
      (row) => (row.metadata as { messageId?: string } | null)?.messageId === messageId,
    );
    expect(mine).toBeDefined();
    expect(mine!.targetType).toBe("queue");
    expect(mine!.targetId).toBe("terremotocolombia-needs-dlq-staging");
    expect((mine!.metadata as { attempts?: number }).attempts).toBe(6);
  });
});
