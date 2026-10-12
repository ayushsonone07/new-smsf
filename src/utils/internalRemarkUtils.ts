const isTagRemark = (text: string): boolean =>
  text.toLowerCase().includes("tag") && text.toLowerCase().includes("added");

const isMetadataKey = (key: string): boolean => {
  const normalized = key.replace(/[_\s-]+/g, "").toLowerCase();
  return [
    "time",
    "timestamp",
    "datetime",
    "date",
    "departmenttype",
    "servicetype",
    "departmentremark",
    "internalremark",
    "remarks",
  ].includes(normalized);
};

const looksLikeTimestamp = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(trimmed) && !trimmed.includes("T")) {
    return false;
  }

  return !Number.isNaN(new Date(trimmed).getTime());
};

const cleanRemarkText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || isTagRemark(text) || looksLikeTimestamp(text)) return null;
  return text;
};

const getRemarkTextFromRecord = (record: Record<string, unknown>): string | null => {
  for (const key of ["internalRemark", "departmentRemark", "remark", "text", "message", "reply"]) {
    const text = cleanRemarkText(record[key]);
    if (text) return text;
  }

  for (const key of ["internalRemark", "departmentRemark", "remarks"]) {
    const nested = record[key];
    if (Array.isArray(nested) || (nested && typeof nested === "object")) {
      const text = extractLatestFromRemarksData(nested);
      if (text) return text;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (!isMetadataKey(key) && typeof value === "string" && looksLikeTimestamp(value)) {
      const text = cleanRemarkText(key);
      if (text) return text;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (isMetadataKey(key)) continue;
    const text = cleanRemarkText(value);
    if (text) return text;
  }

  return null;
};


export const extractLatestFromRemarksData = (
  value: unknown,
): string => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    try {
      const parsed = JSON.parse(trimmed);
      return extractLatestFromRemarksData(parsed);
    } catch {
      return isTagRemark(trimmed) ? "" : trimmed;
    }
  }

  if (Array.isArray(value)) {
    // Latest remark is expected at the end of the array.
    for (let index = value.length - 1; index >= 0; index--) {
      const extracted = extractLatestFromRemarksData(value[index]);

      if (extracted) {
        return extracted;
      }
    }

    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;

  // Handles:
  // { data: { remark: "...", dateTime: "...", staffName: "..." } }
  if (record.data !== undefined && record.data !== null) {
    const fromData = extractLatestFromRemarksData(record.data);

    if (fromData) {
      return fromData;
    }
  }

  /*
   * Important:
   * These values may be strings, arrays or nested objects.
   *
   * Example:
   * {
   *   internalRemark: [{ remark: "first" }, { remark: "latest" }],
   *   departmentRemark: [...]
   * }
   */
  const remarkKeys = [
    "internalRemark",
    "departmentRemark",
    "remark",
    "text",
    "message",
    "reply",
  ];

  for (const key of remarkKeys) {
    const nestedValue = record[key];

    if (nestedValue === undefined || nestedValue === null) {
      continue;
    }

    const extracted = extractLatestFromRemarksData(nestedValue);

    if (extracted) {
      return extracted;
    }
  }

  if (record.remarks !== undefined && record.remarks !== null) {
    const fromRemarks = extractLatestFromRemarksData(record.remarks);

    if (fromRemarks) {
      return fromRemarks;
    }
  }

  if (record.description !== undefined && record.description !== null) {
    const fromDescription =
      extractLatestFromRemarksData(record.description);

    if (fromDescription) {
      return fromDescription;
    }
  }

  // Legacy DB shape:
  // [{ "remark text": "2026-06-24T13:43:37" }]
  const legacyText = getRemarkTextFromRecord(record);

  return legacyText || "";
};


const normalizeServiceType = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

// const normalizeServiceToken = (value: unknown): string =>
//   normalizeServiceType(value)
//     .replace(/[_\s-]+department$/i, "")
//     .replace(/[_\s-]+/g, "");
const normalizeServiceToken = (value: unknown): string =>
  normalizeServiceType(value)
    .replace(/[_\s-]+department$/i, "")
    .replace(/[_\s-]+service$/i, "")
    .replace(/[_\s-]+/g, "");

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const getExplicitInternalRemark = (record: UnknownRecord | null): string | null => {
  if (!record) return null;

  // const preferredKeys = ["internalRemark", "departmentRemark"];
  // for (const key of preferredKeys) {
  //   const value = record[key];
  //   if (typeof value === "string" && value.trim() && !isTagRemark(value)) {
  //     return value.trim();
  //   }
  // }

  const preferredKeys = ["internalRemark", "departmentRemark"];

  for (const key of preferredKeys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim() &&
      !isTagRemark(value)
    ) {
      return value.trim();
    }

    if (
      Array.isArray(value) ||
      (value && typeof value === "object")
    ) {
      const extracted = extractLatestFromRemarksData(value);

      if (extracted && !isTagRemark(extracted)) {
        return extracted;
      }
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = key.replace(/[_\s-]+/g, "").toLowerCase();
    if (
      (normalizedKey.endsWith("departmentremark") || normalizedKey.endsWith("internalremark")) &&
      typeof value === "string" &&
      value.trim() &&
      !isTagRemark(value)
    ) {
      return value.trim();
    }
  }

  return null;
};

const getScopedInternalRemark = (
  record: UnknownRecord | null,
  serviceTypes: string[] = [],
): string | null => {
  if (!record || serviceTypes.length === 0) return null;

  const normalizedKeys = Object.entries(record).map(([key, value]) => ({
    key,
    value,
    normalizedKey: key.replace(/[_\s-]+/g, "").toLowerCase(),
  }));

  const aliases = serviceTypes.flatMap((serviceType) => {
    const token = normalizeServiceToken(serviceType);
    if (!token) return [];

    if (token.includes("autowebsion")) {
      return ["autowebsion", "automation", "website"];
    }

    if (token.includes("onboarding")) {
      return ["onboarding", "onboardingcustomer"];
    }

    return [token];
  });

  const uniqueAliases = Array.from(new Set(aliases));
  for (const alias of uniqueAliases) {
    const match = normalizedKeys.find(
      ({ normalizedKey }) =>
        normalizedKey.startsWith(alias) &&
        (
          normalizedKey.endsWith("departmentremark") ||
          normalizedKey.endsWith("departmentinternalremark") ||
          normalizedKey.endsWith("internalremark")
        ),
    );

    if (!match) continue;

    if (
      typeof match.value === "string" &&
      match.value.trim() &&
      !isTagRemark(match.value)
    ) {
      return match.value.trim();
    }

    if (
      Array.isArray(match.value) ||
      (match.value && typeof match.value === "object")
    ) {
      const extracted = extractLatestFromRemarksData(match.value);

      if (extracted && !isTagRemark(extracted)) {
        return extracted;
      }
    }
  }

  return null;
};

const serviceMatchesType = (service: unknown, serviceTypes: string[]): boolean => {
  const serviceRecord = toRecord(service);
  if (!serviceRecord) return false;
  if (!serviceTypes.length) return true;

  const serviceType = normalizeServiceToken(serviceRecord.serviceType);
  const departmentType = normalizeServiceToken(serviceRecord.departmentType);

  return serviceTypes.some((candidate) => {
    const normalizedCandidate = normalizeServiceToken(candidate);
    const aliases = normalizedCandidate.includes("onboarding")
      ? [normalizedCandidate, "onboarding", "onboardingcustomer"]
      : [normalizedCandidate];

    return (
      normalizedCandidate &&
      aliases.some((alias) =>
        (serviceType &&
          (alias === serviceType || serviceType.includes(alias) || alias.includes(serviceType))) ||
        (departmentType && alias === departmentType)
      )
    );
  });
};

export const getLatestServiceInternalRemark = (
  customer: unknown,
  serviceTypes: string[] = [],
): string | null => {
  const customerRecord = toRecord(customer);
  if (!customerRecord || !Array.isArray(customerRecord.services)) return null;

  const services = customerRecord.services.filter((service: unknown) =>
    serviceMatchesType(service, serviceTypes),
  );

  for (const service of services) {
    const serviceRecord = toRecord(service);
    if (!serviceRecord) continue;

    const fromServiceExplicit = getExplicitInternalRemark(serviceRecord);
    if (fromServiceExplicit) return fromServiceExplicit;

    const fromRemarks = extractLatestFromRemarksData(serviceRecord.remarks);
    if (fromRemarks) return fromRemarks;

    const fromDescription = extractLatestFromRemarksData(serviceRecord.description);
    if (fromDescription) return fromDescription;
  }

  return null;
};

export const getLatestInternalRemark = (
  customer: unknown,
  serviceTypes: string[] = [],
): string | null => {
  const customerRecord = toRecord(customer);

  if (!customerRecord) {
    return null;
  }

  // 1. Department-specific properties such as:
  // onboardingInternalRemark / googleDepartmentRemark
  const scopedCustomerDetailsRemark = getScopedInternalRemark(
    toRecord(customerRecord.customerDetails),
    serviceTypes,
  );

  if (scopedCustomerDetailsRemark) {
    return scopedCustomerDetailsRemark;
  }

  const scopedTopLevelRemark = getScopedInternalRemark(
    customerRecord,
    serviceTypes,
  );

  if (scopedTopLevelRemark) {
    return scopedTopLevelRemark;
  }

  // 2. Matching service data
  if (Array.isArray(customerRecord.services)) {
    const serviceRemark = getLatestServiceInternalRemark(
      customerRecord,
      serviceTypes,
    );

    if (serviceRemark) {
      return serviceRemark;
    }
  }

  // 3. Current onboarding response:
  // remarks: { departmentRemark: [...], internalRemark: [...] }
  const fromRemarks = extractLatestFromRemarksData(
    customerRecord.remarks,
  );

  if (fromRemarks) {
    return fromRemarks;
  }

  // 4. Older API response formats
  const fromDescription = extractLatestFromRemarksData(
    customerRecord.description,
  );

  if (fromDescription) {
    return fromDescription;
  }

  const fromExplicitTopLevel =
    getExplicitInternalRemark(customerRecord);

  if (fromExplicitTopLevel) {
    return fromExplicitTopLevel;
  }

  const fromCustomerDetails = getExplicitInternalRemark(
    toRecord(customerRecord.customerDetails),
  );

  if (fromCustomerDetails) {
    return fromCustomerDetails;
  }

  return null;
};
// export const getLatestInternalRemark = (
//   customer: unknown,
//   serviceTypes: string[] = [],
// ): string | null => {
//   const customerRecord = toRecord(customer);
//   if (!customerRecord) return null;

//   const scopedCustomerDetailsRemark = getScopedInternalRemark(
//     toRecord(customerRecord.customerDetails),
//     serviceTypes,
//   );
//   if (scopedCustomerDetailsRemark) return scopedCustomerDetailsRemark;

//   const scopedTopLevelRemark = getScopedInternalRemark(customerRecord, serviceTypes);
//   if (scopedTopLevelRemark) return scopedTopLevelRemark;

//   // if (serviceTypes.length > 0 && Array.isArray(customerRecord.services)) {
//   //   const scopedRemark = getLatestServiceInternalRemark(customerRecord, serviceTypes);
//   //   if (scopedRemark) return scopedRemark;

//   //   const hasMatchingService = customerRecord.services.some((service) =>
//   //     serviceMatchesType(service, serviceTypes),
//   //   );

//   //   if (hasMatchingService) return null;

//   //   return null;
//   // }

//   if (serviceTypes.length > 0 && Array.isArray(customerRecord.services)) {
//     const scopedRemark = getLatestServiceInternalRemark(
//       customerRecord,
//       serviceTypes,
//     );



//     if (scopedRemark) {
//       return scopedRemark;
//     }

//     if (customerRecord.remarks) {
//       const fromTopLevelRemarks =
//         extractLatestFromRemarksData(customerRecord.remarks);

//       if (fromTopLevelRemarks) {
//         return fromTopLevelRemarks;
//       }
//     }

//     if (customerRecord.description) {
//       const fromTopLevelDescription =
//         extractLatestFromRemarksData(customerRecord.description);

//       if (fromTopLevelDescription) {
//         return fromTopLevelDescription;
//       }
//     }
//     // Do not return null here.
//     // Some APIs return the service-specific internal remark
//     // at customer.remarks/customer.description level.
//   }

//   const fromExplicitTopLevel = getExplicitInternalRemark(customerRecord);
//   if (fromExplicitTopLevel) return fromExplicitTopLevel;

//   const services = customerRecord.services;
//   if (Array.isArray(services)) {
//     for (const service of services) {
//       const serviceRecord = toRecord(service);
//       if (!serviceRecord) continue;

//       const fromServiceExplicit = getExplicitInternalRemark(serviceRecord);
//       if (fromServiceExplicit) return fromServiceExplicit;

//       if (serviceRecord.remarks) {
//         const fromServiceRemarks = extractLatestFromRemarksData(serviceRecord.remarks);
//         if (fromServiceRemarks) return fromServiceRemarks;
//       }

//       if (serviceRecord.description) {
//         const fromServiceDescription = extractLatestFromRemarksData(serviceRecord.description);
//         if (fromServiceDescription) return fromServiceDescription;
//       }

//       if (Array.isArray(serviceRecord.remarks)) {
//         for (let i = serviceRecord.remarks.length - 1; i >= 0; i--) {
//           const entry = serviceRecord.remarks[i];
//           const entryRecord = toRecord(entry);
//           const text =
//             entryRecord?.departmentRemark ??
//             entryRecord?.remark ??
//             entryRecord?.text ??
//             (entryRecord ? Object.keys(entryRecord)[0] : entry);
//           if (typeof text === "string" && text.trim() && !isTagRemark(text)) {
//             return text.trim();
//           }
//         }
//       }
//     }
//   }

//   if (customerRecord.remarks) {
//     const fromRemarks = extractLatestFromRemarksData(customerRecord.remarks);
//     if (fromRemarks) return fromRemarks;
//   }

//   if (customerRecord.description) {
//     const fromDescription = extractLatestFromRemarksData(customerRecord.description);
//     if (fromDescription) return fromDescription;
//   }

//   const fromCustomerDetails = getExplicitInternalRemark(toRecord(customerRecord.customerDetails));
//   if (fromCustomerDetails) return fromCustomerDetails;

//   if (
//     typeof customerRecord.departmentRemark === "string" &&
//     customerRecord.departmentRemark.trim()
//   ) {
//     return customerRecord.departmentRemark.trim();
//   }

//   if (typeof customerRecord.remark === "string" && customerRecord.remark.trim()) {
//     return customerRecord.remark.trim();
//   }

//   return null;
// };
