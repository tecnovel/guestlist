import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

async function getTodayEvents(userId: string, role: string) {
    if (role === 'ADMIN') {
        return await prisma.event.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { date: 'desc' },
        });
    }

    return await prisma.event.findMany({
        where: {
            status: 'PUBLISHED',
            doorStaff: {
                some: { id: userId },
            },
        },
        orderBy: { date: 'desc' },
    });
}

export default async function DoorEventSelectionPage() {
    const session = await auth();
    if (!session) return null;

    const events = await getTodayEvents(session.user.id, session.user.role);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Select Event</h1>
            <ul className="space-y-4">
                {events.map((event) => (
                    <li key={event.id}>
                        <Link
                            href={`/door/${event.id}`}
                            className="block p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-indigo-500 transition-colors"
                        >
                            <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
                            <p className="text-gray-400 text-sm">
                                {format(new Date(event.date), 'PPP')}
                            </p>
                            {event.venueName && (
                                <p className="text-gray-500 text-xs mt-1">{event.venueName}</p>
                            )}
                        </Link>
                    </li>
                ))}
                {events.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No active events found.</p>
                )}
            </ul>
        </div>
    );
}
