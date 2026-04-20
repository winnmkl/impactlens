import { AssessmentResponseInput } from "./scoring";

export const sectors = [
  "Financial",
  "Connectivity",
  "Information/Database",
  "Service",
  "Operations",
  "Compliance & Governance",
] as const;

type RiskQuestionTemplate = Omit<AssessmentResponseInput, "value"> & {
  id: string;
  nistRef: string;
  isoRef: string;
};

export const riskCatalog: Record<string, RiskQuestionTemplate[]> = {
  RANSOMWARE: [
    {
      id: "rw-1",
      dimension: "LIKELIHOOD",
      factorType: "THREAT_DRIVER",
      prompt: "Are phishing-resistant MFA controls not consistently enforced for privileged users?",
      nistRef: "NIST CSF PR.AA",
      isoRef: "ISO 27001 A.5.17",
    },
    {
      id: "rw-2",
      dimension: "SEVERITY",
      factorType: "THREAT_DRIVER",
      prompt: "Would encrypted production data halt critical student-facing services beyond 24 hours?",
      nistRef: "NIST CSF RC.RP",
      isoRef: "ISO 27001 A.5.30",
    },
    {
      id: "rw-3",
      dimension: "BOTH",
      factorType: "RESILIENCE_FACTOR",
      prompt: "Are immutable backups tested and restorable at least quarterly?",
      nistRef: "NIST CSF PR.IP",
      isoRef: "ISO 27001 A.8.13",
    },
  ],
  DATA_BREACH: [
    {
      id: "db-1",
      dimension: "LIKELIHOOD",
      factorType: "THREAT_DRIVER",
      prompt: "Do data repositories include unclassified records containing PII or SPI?",
      nistRef: "NIST CSF ID.AM",
      isoRef: "ISO 27001 A.5.9",
    },
    {
      id: "db-2",
      dimension: "SEVERITY",
      factorType: "THREAT_DRIVER",
      prompt: "Would unauthorized disclosure expose sensitive personal or institutional data?",
      nistRef: "NIST CSF PR.DS",
      isoRef: "ISO 27001 A.5.12",
    },
    {
      id: "db-3",
      dimension: "BOTH",
      factorType: "RESILIENCE_FACTOR",
      prompt: "Are data retention, encryption, and access reviews continuously monitored?",
      nistRef: "NIST CSF DE.CM",
      isoRef: "ISO 27001 A.8.10",
    },
  ],
  SERVICE_OUTAGE: [
    {
      id: "so-1",
      dimension: "LIKELIHOOD",
      factorType: "THREAT_DRIVER",
      prompt: "Does the platform rely on single points of failure for network or compute?",
      nistRef: "NIST CSF ID.BE",
      isoRef: "ISO 27001 A.8.14",
    },
    {
      id: "so-2",
      dimension: "SEVERITY",
      factorType: "THREAT_DRIVER",
      prompt: "Would a service outage disrupt grading, enrollment, or student records processing?",
      nistRef: "NIST CSF RC.CO",
      isoRef: "ISO 27001 A.5.30",
    },
    {
      id: "so-3",
      dimension: "BOTH",
      factorType: "RESILIENCE_FACTOR",
      prompt: "Are failover and disaster recovery drills performed and documented?",
      nistRef: "NIST CSF RC.IM",
      isoRef: "ISO 27001 A.5.30",
    },
  ],
};

export const riskOptions = [
  { value: "RANSOMWARE", label: "Ransomware Attack" },
  { value: "DATA_BREACH", label: "Sensitive Data Breach" },
  { value: "SERVICE_OUTAGE", label: "Critical Service Outage" },
] as const;
