import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { LinkModal } from '@/components/modals/LinkModal';
import { createPromoterLink, updatePromoterLink, deletePromoterLink, addGuest, updateGuest, deleteGuest } from './actions';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { AddGuestModal } from '@/components/modals/AddGuestModal';
import { EditGuestModal } from '@/components/modals/EditGuestModal';

const prisma = new PrismaClient();

async function getPromoterEvent(id: string, userId: string) {
    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            signupLinks: {
                where: { assignedPromoters: { some: { id: userId } } },
                include: {
                    _count: { select: { guests: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            guests: {
                where: {
                    OR: [
                        { promoterId: userId },
                        { signupLink: { assignedPromoters: { some: { id: userId } } } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    checkIn: true
                }
            }
        },
    });

    if (!event) notFound();

    // Security check: User must be creator OR have links assigned (or just be a promoter who can see public events? No, strict visibility)
    // Actually, if they have no links and didn't create it, they shouldn't see it unless we allow "browsing" events to request links.
    // For now, assume they can only see if they are involved.
    const isCreator = event.createdByUserId === userId;
    const hasLinks = event.signupLinks.length > 0;

    if (!isCreator && !hasLinks) {
        // If they are just navigating to an ID they don't own, maybe 404 or 403.
        // But wait, if they want to create a link for an event they didn't create, they need to see it first?
        // The requirements said: "Promoters can log in and see: Events they are assigned to or events they created."
        // So if they are not assigned, they can't see it.
        // But how do they get assigned? "Admin can manage signup links... PROMOTER: tied to a promoter user."
        // So Admin assigns them.
        // OR "Promoters can create new signup links for events they own or are allowed to promote."
        // If they are allowed to promote, they should see it.
        // Let's assume if they can see it in the list (which we filtered), they can see details.
        // But `getPromoterEvents` filtered by `OR: [created, hasLinks]`.
        // So if they have neither, they shouldn't be here.
        // However, if they just created it, hasLinks is 0 but isCreator is true.
        // So this check is fine.
        if (!isCreator && !hasLinks) {
            // Double check if they are allowed to promote?
            // Maybe we need a separate "PromoterAssignment" table or just rely on links.
            // For now, strict: must have link or be creator.
            notFound();
        }
    }

    return event;
}

export default async function PromoterEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session) return null;
    const { id } = await params;
    const event = await getPromoterEvent(id, session.user.id);

    return (
        <div>
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
                        {event.name}
                    </h2>
                    <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                        <div className="mt-2 flex items-center text-sm text-gray-400">
                            {format(new Date(event.date), 'PPP')}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-400">
                            My Guests: {event.guests.length}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium leading-6 text-white">My Links</h3>
                    <div className="flex space-x-3">
                        <a
                            href={`/promoter/events/${event.id}/export`}
                            className="inline-flex items-center px-3 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Export CSV
                        </a>
                        <LinkModal mode="create" eventId={event.id} userRole="PROMOTER" createAction={createPromoterLink} />
                        <AddGuestModal eventId={event.id} addGuestAction={addGuest} />
                    </div>
                </div>

                <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md border border-gray-800 mb-8">
                    <ul role="list" className="divide-y divide-gray-800">
                        {event.signupLinks.length === 0 ? (
                            <li className="px-4 py-4 sm:px-6 text-center text-gray-400">
                                No links yet. Create one to start promoting.
                            </li>
                        ) : (
                            event.signupLinks.map((link) => (
                                <li key={link.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-indigo-400 truncate">
                                                {link.title || link.slug}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                /s/{link.slug} • {link.type}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            {!link.active ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900 text-red-200 mr-2">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200 mr-2">
                                                    Active
                                                </span>
                                            )}
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-800 text-gray-300 mr-4">
                                                {link._count.guests} / {link.maxTotalGuests || '∞'}
                                            </span>
                                            <LinkModal mode="edit" eventId={event.id} link={link} userRole="PROMOTER" updateAction={updatePromoterLink} deleteAction={deletePromoterLink} />
                                            <CopyLinkButton slug={link.slug} />
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <h3 className="text-lg font-medium leading-6 text-white mb-4">My Guest List</h3>
                <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md border border-gray-800">
                    <ul role="list" className="divide-y divide-gray-800">
                        {event.guests.length === 0 ? (
                            <li className="px-4 py-4 sm:px-6 text-center text-gray-400">
                                No guests signed up yet.
                            </li>
                        ) : (
                            event.guests.map((guest) => (
                                <li key={guest.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {guest.firstName} {guest.lastName}
                                                {guest.plusOnesCount > 0 && <span className="text-gray-400 ml-1">+{guest.plusOnesCount}</span>}
                                            </p>
                                            {guest.note && <p className="text-xs text-gray-500">{guest.note}</p>}
                                        </div>
                                        <div>
                                            {guest.checkIn ? (
                                                !guest.checkIn.checkedOutAt ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Checked In
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Checked Out
                                                    </span>
                                                )
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    Not Arrived
                                                </span>
                                            )}
                                            <span className="ml-4">
                                                <EditGuestModal eventId={event.id} guest={guest} updateAction={updateGuest} deleteAction={deleteGuest} />
                                            </span>
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
