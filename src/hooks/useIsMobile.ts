import { useMediaQuery } from '@mantine/hooks';

export function useIsMobile() {
  return useMediaQuery('(max-width: 47.9375em)');
}
