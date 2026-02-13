export type AgreementStatus = 'active' | 'inactive' | 'pending' | 'expired';

export interface Agreement {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    type: string | null;
    status: AgreementStatus;
    created_at: string;
    updated_at: string;
}
