'use server';

import { PrismaClient, LinkType, FieldMode } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionState } from '@/lib/definitions';

const prisma = new PrismaClient();

const linkSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, and hyphens only"),
    type: z.enum(['PROMOTER', 'PERSONAL']),
    title: z.string().optional(),
    maxTotalGuests: z.string().transform((val) => (val ? parseInt(val, 10) : null)).optional(),
    maxPlusOnesPerSignup: z.string().default("3").transform((val) => parseInt(val, 10)),
    emailMode: z.enum(['HIDDEN', 'OPTIONAL', 'REQUIRED']),
    phoneMode: z.enum(['HIDDEN', 'OPTIONAL', 'REQUIRED']),
    allowNotes: z.string().transform((val) => val === 'on').optional(),
});

export async function createPromoterLink(eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    const validatedFields = linkSchema.safeParse({
        slug: formData.get('slug'),
        type: formData.get('type'),
        title: (formData.get('title') as string) || undefined,
        maxTotalGuests: (formData.get('maxTotalGuests') as string) || undefined,
        maxPlusOnesPerSignup: (formData.get('maxPlusOnesPerSignup') as string) || undefined,
        emailMode: formData.get('emailMode'),
        phoneMode: formData.get('phoneMode'),
        allowNotes: (formData.get('allowNotes') as string) || undefined,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    try {
        await prisma.signupLink.create({
            data: {
                eventId,
                slug: data.slug,
                type: data.type as LinkType,
                title: data.title,
                maxTotalGuests: data.maxTotalGuests,
                maxPlusOnesPerSignup: data.maxPlusOnesPerSignup,
                emailMode: data.emailMode as FieldMode,
                phoneMode: data.phoneMode as FieldMode,
                allowNotes: !!data.allowNotes,
                promoterId: session.user.id, // Always assign to self
                singleUse: data.type === 'PERSONAL',
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to create link. Slug might be taken.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { message: 'Link created successfully', success: true };
}

export async function updatePromoterLink(linkId: string, eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    // First, check if this link belongs to the promoter
    const existingLink = await prisma.signupLink.findUnique({
        where: { id: linkId },
    });

    if (!existingLink) {
        return { message: 'Link not found' };
    }

    if (session.user.role === 'PROMOTER' && existingLink.promoterId !== session.user.id) {
        return { message: 'Unauthorized - you can only edit your own links' };
    }

    const validatedFields = linkSchema.safeParse({
        slug: formData.get('slug'),
        type: formData.get('type'),
        title: (formData.get('title') as string) || undefined,
        maxTotalGuests: (formData.get('maxTotalGuests') as string) || undefined,
        maxPlusOnesPerSignup: (formData.get('maxPlusOnesPerSignup') as string) || '3',
        emailMode: formData.get('emailMode'),
        phoneMode: formData.get('phoneMode'),
        allowNotes: (formData.get('allowNotes') as string) || undefined,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;
    const active = formData.get('active') === 'on';

    try {
        await prisma.signupLink.update({
            where: { id: linkId },
            data: {
                slug: data.slug,
                type: data.type as LinkType,
                title: data.title,
                maxTotalGuests: data.maxTotalGuests,
                maxPlusOnesPerSignup: data.maxPlusOnesPerSignup,
                emailMode: data.emailMode as FieldMode,
                phoneMode: data.phoneMode as FieldMode,
                allowNotes: !!data.allowNotes,
                active,
                singleUse: data.type === 'PERSONAL',
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to update link. Slug might be taken.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { message: 'Link updated successfully', success: true };
}

export async function deletePromoterLink(linkId: string, eventId: string): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    // Check ownership
    const existingLink = await prisma.signupLink.findUnique({
        where: { id: linkId },
    });

    if (!existingLink) {
        return { message: 'Link not found' };
    }

    if (session.user.role === 'PROMOTER' && existingLink.promoterId !== session.user.id) {
        return { message: 'Unauthorized - you can only delete your own links' };
    }

    try {
        await prisma.signupLink.delete({
            where: { id: linkId },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to delete link.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { message: 'Link deleted successfully', success: true };
}

const guestSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    plusOnes: z.coerce.number().min(0),
    note: z.string().optional(),
});

export async function addGuest(eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    const validatedFields = guestSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        plusOnes: formData.get('plusOnes'),
        note: formData.get('note'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { firstName, lastName, email, phone, plusOnes, note } = validatedFields.data;

    try {
        // Find a valid signup link for this promoter
        let link = await prisma.signupLink.findFirst({
            where: {
                eventId,
                promoterId: session.user.id,
                active: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!link) {
            // Check if they are creator
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (event?.createdByUserId === session.user.id) {
                // Create a hidden link for manual adds
                link = await prisma.signupLink.create({
                    data: {
                        eventId,
                        promoterId: session.user.id,
                        slug: `manual-${session.user.id}-${Date.now()}`,
                        type: 'PERSONAL',
                        active: true,
                        title: 'Manual Adds',
                        emailMode: 'OPTIONAL',
                        phoneMode: 'OPTIONAL',
                        allowNotes: true,
                    }
                });
            } else {
                return { message: 'No active signup link found for you to add guests to. Please create a link first.' };
            }
        }

        await prisma.guest.create({
            data: {
                eventId,
                signupLinkId: link.id,
                promoterId: session.user.id,
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                plusOnesCount: plusOnes,
                note,
            },
        });

    } catch (error) {
        console.error(error);
        return { message: 'Failed to add guest.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { success: true };
}

export async function updateGuest(guestId: string, eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    // Check ownership: Guest must belong to a link owned by the promoter
    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        include: { signupLink: true },
    });

    if (!guest) {
        return { message: 'Guest not found' };
    }

    if (session.user.role === 'PROMOTER') {
        const isOwned = guest.promoterId === session.user.id || guest.signupLink?.promoterId === session.user.id;
        if (!isOwned) {
            return { message: 'Unauthorized - you can only edit guests on your lists' };
        }
    }

    const validatedFields = guestSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        plusOnes: formData.get('plusOnes'),
        note: formData.get('note'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { firstName, lastName, email, phone, plusOnes, note } = validatedFields.data;

    try {
        await prisma.guest.update({
            where: { id: guestId },
            data: {
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                plusOnesCount: plusOnes,
                note,
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to update guest.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { message: 'Guest updated successfully', success: true };
}

export async function deleteGuest(guestId: string, eventId: string): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    // Check ownership
    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        include: { signupLink: true },
    });

    if (!guest) {
        return { message: 'Guest not found' };
    }

    if (session.user.role === 'PROMOTER') {
        const isOwned = guest.promoterId === session.user.id || guest.signupLink?.promoterId === session.user.id;
        if (!isOwned) {
            return { message: 'Unauthorized - you can only delete guests on your lists' };
        }
    }

    try {
        await prisma.guest.delete({
            where: { id: guestId },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to delete guest.' };
    }

    revalidatePath(`/promoter/events/${eventId}`);
    return { message: 'Guest deleted successfully', success: true };
}
