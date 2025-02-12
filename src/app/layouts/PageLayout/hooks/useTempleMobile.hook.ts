import { useStorage } from '../../../../lib/temple/front';

export const useTempleMobile = () => {
  const [isTempleMobileOverlaySkipped, setIsTempleMobileOverlaySkipped] = useStorage(
    'is_temple_mobile_overlay_skipped',
    true
  );

  return {
    isTempleMobileOverlaySkipped,
    setIsTempleMobileOverlaySkipped
  };
};
