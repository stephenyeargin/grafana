import { AbstractLabelOperator, CoreApp, DataSourceInstanceSettings, PluginMetaInfo, PluginType } from '@grafana/data';
import { setBackendSrv, getBackendSrv } from '@grafana/runtime';
import { TemplateSrv } from 'app/features/templating/template_srv';

import { defaultPyroscopeQueryType } from './dataquery.gen';
import { normalizeQuery, PyroscopeDataSource } from './datasource';
import { Query } from './types';

/** When the datasource checks for the presence of the app, it will check for grafana-pyroscope-app. This makes it fail */
export function mockFetchPyroscopeAppPluginNotFound() {
  setBackendSrv({
    ...getBackendSrv(),
    get: (path: string) => {
      // Mock GCOM plugins (remote) if necessary
      if (path === `/api/plugins/grafana-pyroscope-app/settings`) {
        return Promise.reject({ message: 'Plugin not found, no installed plugin with that id' });
      }
      return Promise.reject('unexpected endpoint');
    },
  });
}

describe('Pyroscope data source', () => {
  let ds: PyroscopeDataSource;
  beforeEach(() => {
    ds = new PyroscopeDataSource(defaultSettings);
    mockFetchPyroscopeAppPluginNotFound(); // No pyroscope app installed
  });

  describe('importing queries', () => {
    it('keeps all labels and values', async () => {
      const queries = await ds.importFromAbstractQueries([
        {
          refId: 'A',
          labelMatchers: [
            { name: 'foo', operator: AbstractLabelOperator.Equal, value: 'bar' },
            { name: 'foo2', operator: AbstractLabelOperator.Equal, value: 'bar2' },
          ],
        },
      ]);
      expect(queries[0].labelSelector).toBe('{foo="bar", foo2="bar2"}');
    });
  });

  describe('exporting queries', () => {
    it('keeps all labels and values', async () => {
      const queries = await ds.exportToAbstractQueries([
        {
          refId: 'A',
          labelSelector: '{foo="bar", foo2="bar2"}',
          queryType: 'both',
          profileTypeId: '',
          groupBy: [''],
        },
      ]);
      expect(queries).toMatchObject([
        {
          refId: 'A',
          labelMatchers: [
            { name: 'foo', operator: AbstractLabelOperator.Equal, value: 'bar' },
            { name: 'foo2', operator: AbstractLabelOperator.Equal, value: 'bar2' },
          ],
        },
      ]);
    });
  });

  describe('applyTemplateVariables', () => {
    const templateSrv = new TemplateSrv();
    templateSrv.replace = jest.fn((query: string): string => {
      return query.replace(/\$var/g, 'interpolated');
    });

    it('should not update labelSelector if there are no template variables', () => {
      ds = new PyroscopeDataSource(defaultSettings, templateSrv);
      const query = ds.applyTemplateVariables(defaultQuery({ labelSelector: `no var`, profileTypeId: 'no var' }), {});
      expect(query).toMatchObject({
        labelSelector: `no var`,
        profileTypeId: 'no var',
      });
    });

    it('should update labelSelector if there are template variables', () => {
      ds = new PyroscopeDataSource(defaultSettings, templateSrv);
      const query = ds.applyTemplateVariables(
        defaultQuery({ labelSelector: `{$var="$var"}`, profileTypeId: '$var' }),
        {}
      );
      expect(query).toMatchObject({ labelSelector: `{interpolated="interpolated"}`, profileTypeId: 'interpolated' });
    });
  });
});

describe('normalizeQuery', () => {
  it('correctly normalizes the query', () => {
    // We need the type assertion here because the query types are inherently wrong in explore.
    let normalized = normalizeQuery({} as Query);
    expect(normalized).toMatchObject({
      labelSelector: '{}',
      groupBy: [],
      queryType: 'profile',
    });

    normalized = normalizeQuery({
      labelSelector: '{app="myapp"}',
      groupBy: ['app'],
      queryType: 'metrics',
      profileTypeId: 'cpu',
      refId: '',
    });
    expect(normalized).toMatchObject({
      labelSelector: '{app="myapp"}',
      groupBy: ['app'],
      queryType: 'metrics',
      profileTypeId: 'cpu',
    });
  });

  it('correctly normalizes the query when in explore', () => {
    // We need the type assertion here because the query types are inherently wrong in explore.
    const normalized = normalizeQuery({} as Query, CoreApp.Explore);
    expect(normalized).toMatchObject({
      labelSelector: '{}',
      groupBy: [],
      queryType: 'both',
    });
  });
});

const defaultQuery = (query: Partial<Query>): Query => {
  return {
    refId: 'x',
    groupBy: [],
    labelSelector: '',
    profileTypeId: '',
    queryType: defaultPyroscopeQueryType,
    ...query,
  };
};

const defaultSettings: DataSourceInstanceSettings = {
  id: 0,
  uid: 'pyroscope',
  type: 'profiling',
  name: 'pyroscope',
  access: 'proxy',
  meta: {
    id: 'pyroscope',
    name: 'pyroscope',
    type: PluginType.datasource,
    info: {} as PluginMetaInfo,
    module: '',
    baseUrl: '',
  },
  jsonData: {},
  readOnly: false,
};
