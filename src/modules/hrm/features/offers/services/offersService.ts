import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { OFFERS_ENDPOINT_BUILDERS, OFFERS_ENDPOINTS } from "./endpoints";
import type {
  OfferLetter,
  OfferLetterInput,
  OfferLetterListParams,
  OfferLetterSummary,
  OfferStatus,
} from "../types";

function queryString(params: OfferLetterListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data;
}

export const offersService = {
  async list(params: OfferLetterListParams): Promise<{ data: OfferLetter[]; meta: PaginationMeta }> {
    return hrApiGetPaged<OfferLetter[]>(OFFERS_ENDPOINTS.offers + queryString(params));
  },

  async summary(): Promise<OfferLetterSummary> {
    return hrApiGet<OfferLetterSummary>(OFFERS_ENDPOINTS.summary);
  },

  async myOffers(): Promise<OfferLetter[]> {
    return hrApiGet<OfferLetter[]>(OFFERS_ENDPOINTS.myOffers);
  },

  async create(input: OfferLetterInput): Promise<OfferLetter> {
    const { data } = await http.post<HrApiEnvelope<OfferLetter>>(OFFERS_ENDPOINTS.offers, input);
    return unwrap(data);
  },

  async updateStatus(id: number, status: OfferStatus): Promise<OfferLetter> {
    const { data } = await http.patch<HrApiEnvelope<OfferLetter>>(
      OFFERS_ENDPOINT_BUILDERS.status(id),
      { status },
    );
    return unwrap(data);
  },

  async delete(id: number): Promise<void> {
    await http.delete(OFFERS_ENDPOINT_BUILDERS.offer(id));
  },

  async downloadPdf(id: number, fileName: string): Promise<void> {
    const response = await http.get<Blob>(OFFERS_ENDPOINT_BUILDERS.pdf(id), {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
