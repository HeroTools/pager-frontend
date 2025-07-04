import { useParams } from 'next/navigation';

export const useMemberId = () => {
  const params = useParams();

  return params['member-id'] as string;
};
