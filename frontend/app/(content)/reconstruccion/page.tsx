import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import CampaignHero from "@/components/features/campaign/CampaignHero";
import BalanceBoard from "@/components/features/campaign/BalanceBoard";
import SiteList from "@/components/features/campaign/SiteList";
import PledgeForm from "@/components/features/campaign/PledgeForm";
import DonorWall from "@/components/features/campaign/DonorWall";
import CampaignFaq, {
  CAMPAIGN_FAQS,
} from "@/components/features/campaign/CampaignFaq";
import { serverApiGetCached } from "@/lib/server-api";
import type { CampaignBalance, CampaignSite } from "@/lib/campaign-materials";
import { faqSchema, webPageSchema, type JsonLdNode } from "@/lib/jsonld";
import { collectionPointsSchema } from "@/lib/jsonld-campaign";

const CAMPAIGN_DESC =
  "Campaña de recolección de materiales de construcción para las familias afectadas por el terremoto. Registra tu donación, entrégala en el punto de tu ciudad y sigue en tiempo real cuánto se ha recogido y qué ya salió hacia el Chocó.";

export const metadata: Metadata = pageMetadata({
  title: "Campaña de reconstrucción",
  description: CAMPAIGN_DESC,
  path: "/reconstruccion",
});

/**
 * Las lecturas no pueden tumbar la página: si el backend todavía no sirve la
 * campaña (por ejemplo, con la migración aún sin aplicar), la landing sigue
 * explicando la campaña y el formulario avisa por su cuenta.
 */
async function loadCampaign(): Promise<{
  sites: CampaignSite[];
  balance: CampaignBalance | undefined;
}> {
  const [sitesResult, balanceResult] = await Promise.allSettled([
    serverApiGetCached<{ sites: CampaignSite[] }>("/api/campaign/puntos", 60),
    serverApiGetCached<CampaignBalance>("/api/campaign/balance", 30),
  ]);
  return {
    sites: sitesResult.status === "fulfilled" ? sitesResult.value.sites : [],
    balance: balanceResult.status === "fulfilled" ? balanceResult.value : undefined,
  };
}

/**
 * Titular del banner: solo material CONFIRMADO. Lo prometido no se anuncia
 * arriba, por la misma razón por la que el tablero separa las tres cifras.
 */
function receivedLabel(balance: CampaignBalance | undefined): string | undefined {
  const top = balance?.received?.[0];
  if (!top || top.quantity <= 0) return undefined;
  const donations = balance?.confirmedDonations ?? 0;
  const people = donations === 1 ? "1 persona" : `${donations} personas`;
  return `Ya entregaron ${people}: ${top.quantity} ${top.unitLabel} de ${top.label.toLowerCase()} y más.`;
}

/** Los puntos solo entran en el marcado si el backend los sirvió. */
function campaignSchema(sites: CampaignSite[]): JsonLdNode[] {
  const nodes: JsonLdNode[] = [
    webPageSchema({
      path: "/reconstruccion",
      name: "Campaña de reconstrucción",
      description: CAMPAIGN_DESC,
    }),
    faqSchema(CAMPAIGN_FAQS),
  ];
  const points = collectionPointsSchema(sites);
  if (points) nodes.push(points);
  return nodes;
}

export default async function ReconstruccionPage() {
  const { sites, balance } = await loadCampaign();

  return (
    <SubPageShell
      breadcrumb="Reconstrucción"
      path="/reconstruccion"
      extraSchema={campaignSchema(sites)}
    >
      <CampaignHero receivedLabel={receivedLabel(balance)} />

      <section className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <div className="mb-12 rounded-[24px] bg-slate-50 p-6 sm:p-7">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Cómo va la campaña
          </h2>
          <BalanceBoard initial={balance} />
        </div>

        <div id="registrar" className="mb-12 scroll-mt-24">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Registra tu donación
          </h2>
          <p className="mb-5 max-w-[720px] text-sm text-slate-600">
            Al registrarla recibes un código. Ese código es lo que permite que
            tu entrega quede verificada cuando llegues al punto, y es lo que
            hace que las cifras de arriba signifiquen algo.
          </p>
          <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-7">
            <PledgeForm sites={sites} />
          </div>
        </div>

        <div id="puntos" className="mb-12 scroll-mt-24">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Puntos de recolección
          </h2>
          <p className="mb-5 max-w-[720px] text-sm text-slate-600">
            Lleva el material en horario de atención. Si un punto aparece
            pausado o sin espacio, elige otro de tu ciudad antes de salir.
          </p>
          <SiteList sites={sites} />
        </div>

        <CampaignFaq />

        <DonorWall names={balance?.donorWall ?? []} />
      </section>
    </SubPageShell>
  );
}
