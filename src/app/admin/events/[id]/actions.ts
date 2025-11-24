'use server';

import { PrismaClient, LinkType, FieldMode } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionState } from '@/lib/definitions';

const prisma = new PrismaClient();

const linkSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, and hyphens only"),
    type: z.enum(['GENERAL', 'PROMOTER', 'PERSONAL']),
    title: z.string().optional(),
    maxTotalGuests: z.string().transform((val) => (val ? parseInt(val, 10) : null)).optional(),
    maxPlusOnesPerSignup: z.string().default("3").transform((val) => parseInt(val, 10)),
    emailMode: z.enum(['HIDDEN', 'OPTIONAL', 'REQUIRED']),
    phoneMode: z.enum(['HIDDEN', 'OPTIONAL', 'REQUIRED']),
    allowNotes: z.string().transform((val) => val === 'on').optional(),
    promoterId: z.string().optional(),
});

export async function createLink(eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
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
        promoterId: (formData.get('promoterId') as string) || undefined,
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
                promoterId: data.promoterId || null,
                singleUse: data.type === 'PERSONAL',
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to create link. Slug might be taken.' };
    }

    revalidatePath(`/admin/events/${eventId}`);
    return { message: 'Link created successfully', success: true };
}

export async function updateLink(linkId: string, eventId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
        return { message: 'Unauthorized' };
    }

    const validatedFields = linkSchema.extend({
        active: z.string().transform((val) => val === 'on').optional(),
    }).safeParse({
        slug: formData.get('slug'),
        type: formData.get('type'),
        title: (formData.get('title') as string) || undefined,
        maxTotalGuests: (formData.get('maxTotalGuests') as string) || undefined,
        maxPlusOnesPerSignup: (formData.get('maxPlusOnesPerSignup') as string) || undefined,
        emailMode: formData.get('emailMode'),
        phoneMode: formData.get('phoneMode'),
        allowNotes: (formData.get('allowNotes') as string) || undefined,
        promoterId: (formData.get('promoterId') as string) || undefined,
        active: (formData.get('active') as string) || undefined,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

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
                promoterId: data.promoterId || null,
                active: !!data.active,
                singleUse: data.type === 'PERSONAL',
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to update link. Slug might be taken.' };
    }

    revalidatePath(`/admin/events/${eventId}`);
    return { message: 'Link updated successfully', success: true };
}

export async function deleteLink(linkId: string, eventId: string): Promise<ActionState> {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
        return { message: 'Unauthorized' };
    }

    try {
        await prisma.signupLink.delete({
            where: { id: linkId },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to delete link.' };
    }

    revalidatePath(`/admin/events/${eventId}`);
    return { message: 'Link deleted successfully', success: true };
}
