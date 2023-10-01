import { render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { PluginType, rangeUtil } from '@grafana/data';
import { setBackendSrv, getBackendSrv } from '@grafana/runtime';

import { PyroscopeDataSource } from '../datasource';

import { Props, PyroscopeAppIntegration, resetPyroscopeAppIntegrationFetches } from './PyroscopeAppIntegration';

const defaultPyroscopeDataSourceSettings = {
  uid: 'default-pyroscope',
  url: 'http://pyroscope',
  basicAuthUser: 'pyroscope_user',
};

// By default the URL and user will match
const defaultPyroscopeAppSettings = {
  enabled: true,
  jsonData: {
    backendUrl: defaultPyroscopeDataSourceSettings.url,
    basicAuthUser: defaultPyroscopeDataSourceSettings.basicAuthUser,
  },
};

/** When the datasource checks for the presence of the app, it will check for grafana-pyroscope-app */
export function mockFetchPyroscopeAppPlugin(pluginConfiguration?: typeof defaultPyroscopeAppSettings) {
  const returnValues: Record<string, unknown> = {
    [`/api/datasources/uid/${defaultPyroscopeDataSourceSettings.uid}`]: defaultPyroscopeDataSourceSettings,
    [`/api/plugins/grafana-pyroscope-app/settings`]: pluginConfiguration,
  };
  setBackendSrv({
    ...getBackendSrv(),
    get: function <T>(path: string) {
      const value = returnValues[path];
      if (value) {
        return Promise.resolve(value as T);
      }
      return Promise.reject({ message: 'Plugin not found, no installed plugin with that id' });
    },
  });
}

describe('PyroscopeAppIntegration', () => {
  const EXPECTED_BUTTON_LABEL = 'Profiles App';

  beforeEach(() => resetPyroscopeAppIntegrationFetches());

  it('should render if the settings match', async () => {
    mockFetchPyroscopeAppPlugin(defaultPyroscopeAppSettings); // Pyroscope app installed by default
    await act(setup);
    expect(await screen.findAllByText(EXPECTED_BUTTON_LABEL)).toBeDefined();
  });

  it('Should not render if no app settings', async () => {
    mockFetchPyroscopeAppPlugin(undefined);
    await act(setup);
    expect(screen.queryByText(EXPECTED_BUTTON_LABEL)).toBeNull();
  });

  it('Should not render if url does not match', async () => {
    mockFetchPyroscopeAppPlugin({
      ...defaultPyroscopeAppSettings,
      jsonData: { ...defaultPyroscopeAppSettings.jsonData, backendUrl: 'http://mismatch' },
    });
    await act(setup);
    expect(screen.queryByText(EXPECTED_BUTTON_LABEL)).toBeNull();
  });

  it('Should not render if user does not match', async () => {
    mockFetchPyroscopeAppPlugin({
      ...defaultPyroscopeAppSettings,
      jsonData: { ...defaultPyroscopeAppSettings.jsonData, basicAuthUser: 'missmatch' },
    });
    await act(setup);
    expect(screen.queryByText(EXPECTED_BUTTON_LABEL)).toBeNull();
  });

  it('Should not render if plugin not enabled', async () => {
    mockFetchPyroscopeAppPlugin({
      ...defaultPyroscopeAppSettings,
      enabled: false,
    });
    await act(setup);
    expect(screen.queryByText(EXPECTED_BUTTON_LABEL)).toBeNull();
  });
});

function setupDs() {
  const ds = new PyroscopeDataSource({
    ...defaultPyroscopeDataSourceSettings,
    name: 'test',
    type: PluginType.datasource,
    access: 'proxy',
    id: 1,
    jsonData: {},
    meta: {
      name: '',
      id: '',
      type: PluginType.datasource,
      baseUrl: '',
      info: {
        author: {
          name: '',
        },
        description: '',
        links: [],
        logos: {
          large: '',
          small: '',
        },
        screenshots: [],
        updated: '',
        version: '',
      },
      module: '',
    },
    readOnly: false,
  });

  return ds;
}

async function setup(options: { props: Partial<Props> } = { props: {} }) {
  const utils = render(
    <PyroscopeAppIntegration
      query={{
        queryType: 'both',
        labelSelector: '',
        profileTypeId: 'process_cpu:cpu',
        refId: 'A',
        maxNodes: 1000,
        groupBy: [],
      }}
      datasource={setupDs()}
      range={rangeUtil.convertRawToRange({ from: 'now-1h', to: 'now' })}
      {...options.props}
    />
  );
  return { ...utils };
}
