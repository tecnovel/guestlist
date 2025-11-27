import prisma from '@/lib/prisma';
import { LinkType, FieldMode } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { LinkModal } from '@/components/modals/LinkModal';
import { createLink, updateLink, deleteLink } from './actions';
import { CopyLinkButton } from '@/components/CopyLinkButton';



async function getEvent(id: string) {
    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            signupLinks: {
                include: {
                    _count: { select: { guests: true } },
                    guests: { select: { plusOnesCount: true } },
                    assignedPromoters: true,
                },
                orderBy: { createdAt: 'desc' },
            },
            guests: { select: { plusOnesCount: true } },
            _count: { select: { guests: true } },
        },
    });
    if (!event) notFound();
    return event;
}

async function getPromoters() {
    return await prisma.user.findMany({
        where: { role: 'PROMOTER' },
    });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEvent(id);
    const promoters = await getPromoters();

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-7 text-white">
                        {event.name}
                    </h2>
                    <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-6">
                        <div className="flex items-center text-sm text-gray-400">
                            📅 {format(new Date(event.date), 'dd.MM.yyyy')}
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                            Status: {event.status}
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                            Total Guests: {event._count.guests + (event.guests?.reduce((sum, g) => sum + g.plusOnesCount, 0) || 0)}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Edit Event
                    </Link>
                    <a
                        href={`/admin/events/${event.id}/export`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Export CSV
                    </a>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium leading-6 text-white">Signup Links</h3>
                    <LinkModal mode="create" eventId={event.id} promoters={promoters} userRole="ADMIN" createAction={createLink} />
                </div>

                <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md border border-gray-800">
                    <ul role="list" className="divide-y divide-gray-800">
                        {event.signupLinks.length === 0 ? (
                            <li className="px-4 py-4 sm:px-6 text-center text-gray-400">
                                No signup links yet.
                            </li>
                        ) : (
                            event.signupLinks.map((link) => (
                                <li key={link.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-sm font-medium text-indigo-400 truncate">
                                                {link.title || link.slug}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                /s/{link.slug} • {link.type}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                                            {!link.active ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900 text-red-200">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">
                                                    Active
                                                </span>
                                            )}
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-800 text-gray-300">
                                                {(link._count.guests + (link.guests?.reduce((sum, g) => sum + g.plusOnesCount, 0) || 0))} / {link.maxTotalGuests || '∞'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <LinkModal mode="edit" eventId={event.id} link={link} promoters={promoters} userRole="ADMIN" updateAction={updateLink} deleteAction={deleteLink} />
                                                <CopyLinkButton slug={link.slug} />
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
