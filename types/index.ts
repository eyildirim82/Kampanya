
export enum ApplicationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    WAITING = 'WAITING'
}

export enum CampaignType {
    CREDIT = 'CREDIT',
    CARD = 'CARD',
    GENERAL = 'GENERAL'
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'closed';

export interface PageContent {
    heroTitle?: string;
    heroSubtitle?: string;
    bannerImage?: string;
}

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'email' | 'select' | 'checkbox' | 'number' | 'tel';
    required?: boolean;
    options?: string[];
    placeholder?: string;
    width?: 'half' | 'third' | 'full';
    id?: string;
}

export interface FieldTemplate {
    id: string;
    name?: string;
    label: string;
    type: FormField['type'];
    required: boolean;
    options?: string[];
    order?: number;
    createdAt?: string;
}

export interface Campaign {
    id: string;
    slug?: string;
    campaignCode?: string;
    title?: string;
    name?: string;
    description?: string;
    type: CampaignType;
    status?: CampaignStatus; // New field for admin flow
    imageUrl?: string;
    interestRate?: string; // For credit campaigns
    active: boolean;
    pageContent?: PageContent;
    createdAt?: string;
    startDate?: string;
    endDate?: string;
    maxQuota?: number;
    applicationCount?: number;
    formSchema?: FormField[];
    longDescription?: string; // HTML content
    features?: { title: string; description: string; icon?: string }[];
}

export interface Application {
    id: string;
    campaignId: string;
    applicantName: string;
    tckn: string;
    phone: string;
    status: ApplicationStatus;
    appliedAt: string;
    // Admin Table props
    name?: string;     // For compatibility with source table
    campaign?: string; // For compatibility with source table
    date?: string;     // For compatibility with source table
}

export interface Interest {
    id: string;
    campaignId: string;
    campaignName?: string;
    fullName: string;
    email: string;
    phone: string;
    tckn?: string;
    note?: string;
    createdAt: string;
}

export interface WhitelistMember {
    id: string;
    tckn: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    maskedName?: string;
    isActive: boolean;
    isDebtor: boolean;
    createdAt?: string;
    updatedAt?: string;
    syncedAt?: string;
}

export interface User {
    id: string;
    name: string;
    role: 'admin' | 'user';
}

export interface Stats {
    totalApplications: number;
    pendingReviews: number;
    activeCampaigns: number;
    dailyRequests: number;
}

export interface EmailConfig {
    id: string;
    campaignId: string;
    recipientType: 'applicant' | 'admin';
    recipientEmail?: string;
    triggerEvent: 'SUBMISSION' | 'APPROVAL' | 'REJECTION';
    subjectTemplate: string;
    bodyTemplate: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
