import React, { memo, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { CheckboxButton } from '@librechat/client';
import { useLocalize, useSetIndexOptions } from '~/hooks';
import { useBadgeRowContext } from '~/Providers';
import { useChatContext } from '~/Providers/ChatContext';

function NativeWebSearch() {
  const localize = useLocalize();
  const { nativeWebSearch } = useBadgeRowContext();
  const { toggleState: nativeWebSearchEnabled, debouncedChange, isPinned } = nativeWebSearch;
  const { setOption } = useSetIndexOptions();
  const { conversation } = useChatContext();

  const handleChange = (values: {
    e?: React.ChangeEvent<HTMLInputElement>;
    value: string | boolean;
  }) => {
    const checked = typeof values.value === 'boolean' ? values.value : values.value === 'true';
    setOption('web_search')(checked);
    debouncedChange({ value: checked });
  };

  // Sync conversation web_search state with local state on mount or when it changes
  useEffect(() => {
    const webSearchEnabled = conversation?.web_search;
    if (webSearchEnabled !== undefined) {
      debouncedChange({ value: webSearchEnabled });
    }
    // Reason: debouncedChange is stable enough and including it causes unnecessary effect runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.web_search]);

  // Sync nativeWebSearchEnabled with option when it changes
  useEffect(() => {
    setOption('web_search')(nativeWebSearchEnabled);
    // Reason: `setOption` causes a re-render on every update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeWebSearchEnabled, conversation?.web_search]);

  return (
    <>
      {(nativeWebSearchEnabled || isPinned) && (
        <CheckboxButton
          className="max-w-fit"
          checked={nativeWebSearchEnabled}
          setValue={handleChange}
          label={localize('com_ui_web_search')}
          isCheckedClassName="border-purple-600/40 bg-purple-500/10 hover:bg-purple-700/10"
          icon={<Globe className="icon-md" />}
        />
      )}
    </>
  );
}

export default memo(NativeWebSearch);
