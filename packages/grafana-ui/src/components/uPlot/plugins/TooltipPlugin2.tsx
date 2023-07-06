import { css } from '@emotion/css';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMountedState } from 'react-use';
import uPlot from 'uplot';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../../themes/ThemeContext';
import { UPlotConfigBuilder } from '../config/UPlotConfigBuilder';

import { getRandomContent } from './utils';

interface TooltipPlugin2Props {
  config: UPlotConfigBuilder;
}

/**
 * @alpha
 */
export const TooltipPlugin2 = ({ config }: TooltipPlugin2Props) => {
  const plotInstance = useRef<uPlot>();
  const isMounted = useMountedState();

  const [cursorPos, setCursorPos] = useState({ left: 0, top: 0 });
  const style = useStyles2(getStyles);

  const [contents, setContents] = useState(getRandomContent);

  // Add uPlot hooks to the config, or re-add when the config changed
  useLayoutEffect(() => {
    const plotEnter = () => {
      if (!isMounted()) {
        return;
      }
      plotInstance.current?.root.classList.add('plot-active');
    };

    const plotLeave = () => {
      if (!isMounted()) {
        return;
      }
      plotInstance.current?.root.classList.remove('plot-active');
    };

    // cache uPlot plotting area bounding box
    // config.addHook('syncRect', (u, rect) => (bbox = rect));

    config.addHook('init', (u) => {
      plotInstance.current = u;

      u.root.parentElement?.addEventListener('focus', plotEnter);
      u.over.addEventListener('mouseenter', plotEnter);

      u.root.parentElement?.addEventListener('blur', plotLeave);
      u.over.addEventListener('mouseleave', plotLeave);
    });

    config.addHook('setCursor', (u) => {
      setCursorPos({ left: u.cursor.left!, top: u.cursor.top! });
    });

    config.addHook('setLegend', (u) => {
      setContents(getRandomContent());
    });
  }, [config, setCursorPos, setContents]);

  if (plotInstance.current) {
    return createPortal(
      <div className={style.tooltipWrapper} style={{ transform: `translate(${cursorPos.left}px, ${cursorPos.top}px)` }}>
        {contents}
      </div>,
      plotInstance.current.over
    );
  }

  return <div></div>;
};

const getStyles = (theme: GrafanaTheme2) => ({
  tooltipWrapper: css`
    background: ${theme.colors.background.secondary};
    top: 0;
    left: 0;
    pointer-events: none;
    position: absolute;
    z-index: 1;
  `,
});