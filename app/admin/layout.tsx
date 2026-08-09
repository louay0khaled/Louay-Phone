import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect('/admin/login');

  const { data: admin } = await supabase
    .from('admins')
    .select('id,name,role,is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }

  return <>{children}</>;
}
