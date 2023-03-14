import { css } from '@emotion/css';
import React, { useEffect } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Field, RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { loadDataSources } from 'app/features/datasources/state/actions';
import { AlertmanagerChoice } from 'app/plugins/datasource/alertmanager/types';
import { useDispatch } from 'app/types';

import { alertmanagerApi } from '../../api/alertmanagerApi';
import { useExternalDataSourceAlertmanagers } from '../../hooks/useExternalAmSelector';

import { ExternalAlertmanagerDataSources } from './ExternalAlertmanagerDataSources';

const alertmanagerChoices: Array<SelectableValue<AlertmanagerChoice>> = [
  { value: AlertmanagerChoice.Internal, label: 'Only Internal' },
  { value: AlertmanagerChoice.External, label: 'Only External' },
  { value: AlertmanagerChoice.All, label: 'Both internal and external' },
];

export const ExternalAlertmanagers = () => {
  const styles = useStyles2(getStyles);
  const dispatch = useDispatch();

  const externalDsAlertManagers = useExternalDataSourceAlertmanagers();

  const {
    useSaveExternalAlertmanagersConfigMutation,
    useGetExternalAlertmanagerConfigQuery,
    useGetExternalAlertmanagersQuery,
  } = alertmanagerApi;

  const [saveExternalAlertManagers] = useSaveExternalAlertmanagersConfigMutation();
  const { currentData: externalAlertmanagerConfig } = useGetExternalAlertmanagerConfigQuery();

  // Just to refresh the status periodically
  useGetExternalAlertmanagersQuery(undefined, { pollingInterval: 5000 });

  const alertmanagersChoice = externalAlertmanagerConfig?.alertmanagersChoice;

  const isExternal = alertmanagersChoice && alertmanagersChoice !== AlertmanagerChoice.Internal

  useEffect(() => {
    if (isExternal) {
      dispatch(loadDataSources());
    }
  }, [dispatch, isExternal]);

  const onChangeAlertmanagerChoice = (alertmanagersChoice: AlertmanagerChoice) => {
    saveExternalAlertManagers({ alertmanagersChoice });
  };

  return (
    <div>
      <h4>External Alertmanagers</h4>

      <div className={styles.amChoice}>
        <Field
          label="Send alerts to"
          description={<>
            <p>Configures how the Grafana alert rule evaluation engine Alertmanager handles your alerts.</p> <p>Internal (Grafana built-in Alertmanager), External (All Alertmanagers configured below), or both.</p>
          </>}
        >
          <RadioButtonGroup
            options={alertmanagerChoices}
            value={alertmanagersChoice}
            onChange={(value) => onChangeAlertmanagerChoice(value!)}
          />
        </Field>
      </div>

      {isExternal && (
        <ExternalAlertmanagerDataSources alertmanagers={externalDsAlertManagers} inactive={false} />
      )}
    </div>
  );
};

export const getStyles = (theme: GrafanaTheme2) => ({
  url: css`
    margin-right: ${theme.spacing(1)};
  `,
  actions: css`
    margin-top: ${theme.spacing(2)};
    display: flex;
    justify-content: flex-end;
  `,
  table: css`
    margin-bottom: ${theme.spacing(2)};
  `,
  amChoice: css`
    margin-bottom: ${theme.spacing(4)};
  `,
});
