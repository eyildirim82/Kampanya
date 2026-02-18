
import React from 'react';
import { getWhitelistMembers } from '@/app/admin/actions';
import WhitelistManagement from '@/components/admin/WhitelistManagement';
import { WhitelistMember } from '@/types';

export default async function WhitelistPage() {
    // getWhitelistMembers returns raw Supabase data. We need to map it if needed, 
    // or ensure getWhitelistMembers maps it to WhitelistMember[]
    // In admin/actions.ts:
    // return data; 
    // And data comes from 'member_whitelist'.
    // Mapping:
    // id -> id
    // tckn -> tckn
    // masked_name -> maskedName / fullName
    // is_active -> isActive
    // is_debtor -> isDebtor
    // synced_at -> syncedAt / etc
    // updated_at -> updatedAt

    const rawData = await getWhitelistMembers();

    const members: WhitelistMember[] = rawData.map((item: any) => ({
        id: item.id,
        tckn: item.tckn,
        // The type definition likely expects 'fullName' or 'maskedName'. 
        // Let's use what we have.
        // If type WhitelistMember has 'fullName', map 'masked_name' to it.
        fullName: item.masked_name,
        maskedName: item.masked_name,
        isActive: item.is_active,
        isDebtor: item.is_debtor,
        syncedAt: item.synced_at,
        updatedAt: item.updated_at
    }));

    return (
        <div className="max-w-7xl mx-auto">
            <WhitelistManagement initialMembers={members} />
        </div>
    );
}
