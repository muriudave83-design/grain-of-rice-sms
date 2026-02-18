export interface AuditEvent {
  name: string; // <domain>.<action>

  actor: {
    userId: string;
    role: string;
  };

  entity: {
    type: string;
    id?: string;
  };

  metadata: Record<string, any>;

  occurredAt: Date;
}
