import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

const prisma = new PrismaClient();

async function getEvents() {
    return await prisma.event.findMany({
        orderBy: { date: 'desc' },
        include: {
            _count: {
                select: { guests: true },
            },
        },
    });
}

export default async function EventsPage() {
    const events = await getEvents();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Events</h1>
                <Link
                    href="/admin/events/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Event
                </Link>
            </div>

            <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md border border-gray-800">
                <ul role="list" className="divide-y divide-gray-800">
                    {events.length === 0 ? (
                        <li className="px-4 py-4 sm:px-6 text-center text-gray-400">
                            No events found. Create one to get started.
                        </li>
                    ) : (
                        events.map((event) => (
                            <li key={event.id}>
                                <Link href={`/admin/events/${event.id}`} className="block hover:bg-gray-800 transition duration-150 ease-in-out">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-indigo-400 truncate">{event.name}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {event.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-400">
                                                    {format(new Date(event.date), 'PPP')}
                                                    {event.startTime && ` • ${event.startTime}`}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-400 sm:mt-0">
                                                <p>
                                                    {event._count.guests} Guests
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
