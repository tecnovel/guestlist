'use server';

import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/lib/definitions';

const prisma = new PrismaClient();

export async function checkInGuest(guestId: string, eventId: string): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'ENTRY_STAFF' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized', success: false };
    }

    try {
        // Check if already checked in
        const existingCheckIn = await prisma.checkIn.findUnique({
            where: { guestId },
        });

        if (existingCheckIn) {
            // If checked out, clear the checkedOutAt date
            if (existingCheckIn.checkedOutAt) {
                await prisma.checkIn.update({
                    where: { guestId },
                    data: {
                        checkedOutAt: null,
                        checkedInByUserId: session.user.id,
                        checkedInAt: new Date(), // Optionally update check-in time
                    },
                });
            } else {
                // Already checked in and not checked out - do nothing or return success
                return { success: true, message: 'Guest already checked in' };
            }
        } else {
            await prisma.checkIn.create({
                data: {
                    guestId,
                    checkedInByUserId: session.user.id,
                },
            });
        }
    } catch (error) {
        console.error(error);
        return { message: 'Failed to check in guest.' };
    }

    revalidatePath(`/door/${eventId}`);
    return { success: true };
}

export async function checkOutGuest(guestId: string, eventId: string): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'ENTRY_STAFF' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized', success: false };
    }

    try {
        await prisma.checkIn.update({
            where: { guestId },
            data: {
                checkedOutAt: new Date(),
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to check out guest.' };
    }

    revalidatePath(`/door/${eventId}`);
    return { success: true };
}
