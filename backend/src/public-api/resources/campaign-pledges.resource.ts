/**
 * Recurso `api/public/campaign-pledges` — compromisos de donación.
 *
 * Solo list/get. Se OMITEN create/edit/delete a propósito: un compromiso nace
 * en el formulario público y se cierra cuando el responsable del punto
 * confirma la entrega. Si el panel pudiera marcarlo como recibido, la cifra
 * "verificado" dejaría de significar que alguien vio el material.
 */
import { z } from "zod";
import { createCrudRouter, type CrudResource } from "@/public-api/crud-factory";
import * as service from "@/services/campaign/admin-pledges";

const responseSchema = z.object({
  id: z.string(),
  code: z.string(),
  donorName: z.string(),
  donorContact: z.string(),
  items: z.array(
    z.object({ material: z.string(), quantity: z.number(), unit: z.string() }),
  ),
  status: z.string(),
  siteName: z.string().nullable(),
  city: z.string().nullable(),
  publicAlias: z.string().nullable(),
  note: z.string(),
  photo: z.string().nullable(),
  createdAt: z.number(),
});

export const campaignPledgesResource: CrudResource<
  service.PledgeAdminDTO,
  service.PledgeAdminDTO,
  never,
  never
> = {
  capability: "campaign",
  auditType: "campaign_pledge",
  schemas: { response: responseSchema },
  ops: {
    list: () => service.listPledges(),
    get: (id) => service.getPledge(id),
  },
};

export const publicCampaignPledgesRouter = createCrudRouter(campaignPledgesResource);
