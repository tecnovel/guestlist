'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            email: formData.get('email'),
            password: formData.get('password'),
            redirect: false,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }

    // Get the session to determine redirect path
    const session = await auth();
    if (!session) {
        return 'Authentication failed';
    }

    // Redirect based on role
    switch (session.user.role) {
        case 'ADMIN':
            redirect('/admin');
        case 'PROMOTER':
            redirect('/promoter');
        case 'ENTRY_STAFF':
            redirect('/door');
        default:
            redirect('/login');
    }
}
