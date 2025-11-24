import Link from 'next/link';
import { signOut, auth } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { ViewSwitcher } from '@/components/ViewSwitcher';

export default async function PromoterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="border-b border-gray-800 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-indigo-500">Promoter</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    href="/promoter"
                                    className="border-transparent text-gray-300 hover:border-gray-300 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/promoter/events"
                                    className="border-transparent text-gray-300 hover:border-gray-300 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                                >
                                    My Events
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <ViewSwitcher userRole={session?.user?.role || ''} />
                            <form
                                action={async () => {
                                    'use server';
                                    await signOut();
                                }}
                            >
                                <button
                                    type="submit"
                                    className="p-2 text-gray-400 hover:text-white focus:outline-none ml-2"
                                >
                                    <LogOut className="h-6 w-6" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
            </main>
        </div>
    );
}
