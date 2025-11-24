import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { Plus, Trash } from 'lucide-react';
import { deleteUser } from './actions';

const prisma = new PrismaClient();

async function getUsers() {
    return await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Users</h1>
                <Link
                    href="/admin/users/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Create User
                </Link>
            </div>

            <div className="bg-gray-900 shadow overflow-hidden sm:rounded-md border border-gray-800">
                <ul role="list" className="divide-y divide-gray-800">
                    {users.map((user) => (
                        <li key={user.id} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-white truncate">{user.name || 'No Name'}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                                        user.role === 'PROMOTER' ? 'bg-blue-100 text-blue-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {user.role}
                                    </span>
                                    <form action={deleteUser.bind(null, user.id)}>
                                        <button type="submit" className="text-gray-400 hover:text-red-500">
                                            <Trash className="h-5 w-5" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
