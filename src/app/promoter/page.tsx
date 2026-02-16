import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Metadata } from 'next';
import { Users, Calendar, Link as LinkIcon } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Promoter Dashboard',
};



async function getPromoterStats(userId: string, role: string) {
    if (role === 'ADMIN') {
        const eventsCreated = await prisma.event.count();
        const linksAssigned = await prisma.signupLink.count();
        const guestsAggregate = await prisma.guest.aggregate({
            _count: { _all: true },
            _sum: { plusOnesCount: true },
        });
        const guests = (guestsAggregate._count._all || 0) + (guestsAggregate._sum.plusOnesCount || 0);
        return { eventsCreated, linksAssigned, guests };
    }

    // Events created by me
    const eventsCreated = await prisma.event.count({
        where: { createdByUserId: userId },
    });

    // Links assigned to me
    const linksAssigned = await prisma.signupLink.count({
        where: { assignedPromoters: { some: { id: userId } } },
    });

    // Guests signed up via my links
    const guestsAggregate = await prisma.guest.aggregate({
        where: {
            signupLink: {
                assignedPromoters: { some: { id: userId } },
            },
        },
        _count: {
            _all: true,
        },
        _sum: {
            plusOnesCount: true,
        },
    });

    const guests = (guestsAggregate._count._all || 0) + (guestsAggregate._sum.plusOnesCount || 0);

    return {
        eventsCreated,
        linksAssigned,
        guests,
    };
}

export default async function PromoterDashboard() {
    const session = await auth();
    if (!session) return null;

    const stats = await getPromoterStats(session.user.id, session.user.role);

    return (
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard</h1>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 sm:p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">My Guests</h3>
                        <Users className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.guests}</div>
                    <p className="text-xs text-gray-500 mt-1">Total signups via your links</p>
                </div>
                <div className="p-4 sm:p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Active Links</h3>
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.linksAssigned}</div>
                </div>
                <div className="p-4 sm:p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Events Created</h3>
                        <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.eventsCreated}</div>
                </div>
            </div>
        </div>
    );
}
