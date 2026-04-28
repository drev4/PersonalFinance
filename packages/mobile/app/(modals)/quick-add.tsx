import { useRouter } from 'expo-router';
import { QuickAddModal } from '@/components/QuickAddModal';

export default function QuickAddScreen() {
  const router = useRouter();

  return <QuickAddModal onClose={() => router.back()} />;
}
