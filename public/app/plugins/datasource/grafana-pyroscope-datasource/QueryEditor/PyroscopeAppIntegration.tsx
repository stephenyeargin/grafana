import React, { useEffect, useState } from 'react';

import { QueryEditorProps, TimeRange, DateTime } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { LinkButton } from '@grafana/ui';

import { PyroscopeDataSource } from '../datasource';
import { PyroscopeDataSourceOptions, Query } from '../types';

const PYROSCOPE_APP_ID = 'grafana-pyroscope-app';

/* Global promise to fetch the pyroscope app settings */
let pyroscopeAppSettings: Promise<PyroscopeAppSettings> | null = null;
/* Global promises to fetch pyroscope datasource settings by uid as encountered */
const pyroscopeDatasourceSettingsByUid: Record<string, Promise<PyroscopeDatasourceSettings>> = {};

/* Reset promises for testing purposes */
export function resetPyroscopeAppIntegrationFetches() {
  pyroscopeAppSettings = null;
  Object.keys(pyroscopeDatasourceSettingsByUid).forEach((key) => delete pyroscopeDatasourceSettingsByUid[key]);
}

/** A subset of the `PyroscopeDataSource` `QueryEditorProps` */
export type Props = Pick<
  QueryEditorProps<PyroscopeDataSource, Query, PyroscopeDataSourceOptions>,
  'datasource' | 'query' | 'range'
>;

/** A subset of the app settings that are relevant for this integration */
type PyroscopeAppSettings = {
  enabled: boolean;
  jsonData: {
    backendUrl: string;
    basicAuthUser: string;
  };
};

/** A subset of the datasource settings that are relevant for this integration */
type PyroscopeDatasourceSettings = {
  url: string;
  basicAuthUser: string;
};

export function PyroscopeAppIntegration(props: Props) {
  const [appPlugin, setAppPlugin] = useState<PyroscopeAppSettings>();
  const [datasource, setDatasource] = useState<PyroscopeDatasourceSettings>();

  const {
    datasource: { uid: datasourceUid },
    query,
    range,
  } = props;

  useEffect(() => {
    if (pyroscopeAppSettings == null) {
      const params = null;
      const requestId = PYROSCOPE_APP_ID;
      pyroscopeAppSettings = getBackendSrv().get<PyroscopeAppSettings>(
        `/api/plugins/${PYROSCOPE_APP_ID}/settings`,
        params,
        requestId,
        { showErrorAlert: false }
      );
    }

    pyroscopeAppSettings.then(setAppPlugin, () => setAppPlugin(undefined));
  }, []);

  useEffect(() => {
    let datasourceSettings = pyroscopeDatasourceSettingsByUid[datasourceUid];

    if (appPlugin == null) {
      // Don't bother fetching the datasource settings until we have confirmed the presence of the app plugin
      return;
    }

    if (!appPlugin.enabled) {
      // Don't bother fetching if the plugin is disabled
      return;
    }

    if (datasourceSettings == null) {
      // This explicit fetch of the datasource by its id ensures that we obtain its authentication settings
      datasourceSettings = getBackendSrv().get<PyroscopeDatasourceSettings>(`/api/datasources/uid/${datasourceUid}`);
      pyroscopeDatasourceSettingsByUid[datasourceUid] = datasourceSettings;
    }

    datasourceSettings.then(setDatasource, () => setDatasource(undefined));
  }, [appPlugin, datasourceUid]);

  if (!isPyroscopeDatasourceCompatibleWithPlugin(datasource, appPlugin)) {
    // No need for a component -- we are not compatible
    return null;
  }

  const queryParam = generateQueryParams(query, range);

  return (
    <LinkButton
      variant="secondary"
      icon="external-link-alt"
      tooltip={'Open query in Profiles App'}
      target="_blank"
      href={`/a/${PYROSCOPE_APP_ID}/single?${queryParam}`}
    >
      Profiles App
    </LinkButton>
  );
}

export function isPyroscopeDatasourceCompatibleWithPlugin(
  datasource?: PyroscopeDatasourceSettings,
  appPlugin?: PyroscopeAppSettings
) {
  if (!appPlugin || !datasource) {
    return false;
  }

  return (
    datasource.url === appPlugin.jsonData.backendUrl && datasource.basicAuthUser === appPlugin.jsonData.basicAuthUser
  );
}

function stringifyRawTimeRangePart(rawTimeRangePart: DateTime | string) {
  if (typeof rawTimeRangePart === 'string') {
    return rawTimeRangePart;
  }

  // The `unix` result as a string is compatible with Pyroscope's range part format
  return Math.round(rawTimeRangePart.unix()).toString();
}

export function translateGrafanaTimeRangeToPyroscope(timeRange: TimeRange) {
  const from = stringifyRawTimeRangePart(timeRange.raw.from);
  const until = stringifyRawTimeRangePart(timeRange.raw.to);

  return { from, until };
}

export function generateQueryParams(query: Query, range?: TimeRange) {
  if (!range) {
    return '';
  }
  const { labelSelector, profileTypeId } = query;

  const params = new URLSearchParams();

  if (profileTypeId && profileTypeId !== '') {
    params.set('query', profileTypeId + (labelSelector || ''));
  }

  if (range) {
    const { from, until } = translateGrafanaTimeRangeToPyroscope(range);
    params.set('from', from);
    params.set('until', until);
  }

  return params.toString();
}
