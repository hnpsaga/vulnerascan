export interface Run {
  schemaVersion: number;
  id: string;
  name?: string;
  timestamp: string;
  status: "completed";
}
