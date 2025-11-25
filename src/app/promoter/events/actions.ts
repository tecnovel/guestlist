'use server';

import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionState } from '@/lib/definitions';

const prisma = new PrismaClient();

const eventSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, and hyphens only"),
    date: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    venueName: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    capacity: z.string().transform((val) => (val ? parseInt(val, 10) : null)).nullable().optional(),
});

export async function createPromoterEvent(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session || (session.user.role !== 'PROMOTER' && session.user.role !== 'ADMIN')) {
        return { message: 'Unauthorized' };
    }

    const validatedFields = eventSchema.safeParse({
        name: formData.get('name'),
        slug: formData.get('slug'),
        date: formData.get('date'),
        startTime: (formData.get('startTime') as string) || undefined,
        endTime: (formData.get('endTime') as string) || undefined,
        venueName: (formData.get('venueName') as string) || undefined,
        description: (formData.get('description') as string) || undefined,
        status: (formData.get('status') as string) || 'DRAFT',
        capacity: (formData.get('capacity') as string) || null,
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    try {
        await prisma.event.create({
            data: {
                ...data,
                date: new Date(data.date),
                createdByUserId: session.user.id,
                // Auto-assign creator to the event
                assignedPromoters: {
                    connect: { id: session.user.id }
                }
            },
        });
    } catch (error) {
        console.error(error);
        return { message: 'Failed to create event. Slug might be taken.' };
    }

    redirect('/promoter/events');
}
