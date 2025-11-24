import { PrismaClient } from '@prisma/client';

import { Users, Calendar, CheckCircle } from 'lucide-react';

const prisma = new PrismaClient();

async function getStats() {
    const totalEvents = await prisma.event.count();
    const totalGuests = await prisma.guest.count();
    const totalCheckIns = await prisma.checkIn.count();

    // Calculate conversion rate
    const conversionRate = totalGuests > 0 ? Math.round((totalCheckIns / totalGuests) * 100) : 0;

    return {
        totalEvents,
        totalGuests,
        totalCheckIns,
        conversionRate,
    };
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Total Events</h3>
                        <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalEvents}</div>
                </div>
                <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Total Guests</h3>
                        <Users className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalGuests}</div>
                </div>
                <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Checked In</h3>
                        <CheckCircle className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                </div>
                <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-gray-400">Conversion Rate</h3>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-gray-400"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                </div>
            </div>
        </div>
    );
}
