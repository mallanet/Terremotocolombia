"use client";

import { Fragment, type ReactNode } from "react";
import { RowActions, type RowActionHandlers } from "./row-actions";
import { StatusCell } from "./status-cell";
import { ModelForm } from "./model-form";
import { renderCell } from "./model-cell";
import { VolunteerFicha } from "../../volunteers/volunteer-ficha";
import type { ModelConfig } from "../model-registry";
import type { ModelRow } from "../application/models-gateway";

export interface ModelRowProps {
  model: ModelConfig;
  row: ModelRow;
  span: number;
  pending: boolean;
  statusEditable: boolean;
  fichaOpen: boolean;
  editOpen: boolean;
  actions: RowActionHandlers | null;
  onStatus: (status: string) => void;
  onCloseFicha: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (input: ModelRow) => void;
}

function ExpandedRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr className="border-b border-border-soft bg-surface-muted last:border-0">
      <td colSpan={span} className="px-3 py-3">
        {children}
      </td>
    </tr>
  );
}

function RowCell(props: {
  colKey: string;
  row: ModelRow;
  path: string;
  editable: boolean;
  pending: boolean;
  onStatus: (status: string) => void;
}) {
  if (props.colKey !== "status") {
    return <td className="px-3 py-2 align-top">{renderCell(props.row[props.colKey])}</td>;
  }
  return (
    <td className="px-3 py-2 align-top">
      <StatusCell
        path={props.path}
        value={props.row.status}
        editable={props.editable}
        pending={props.pending}
        onChange={props.onStatus}
      />
    </td>
  );
}

export function ModelRowView(props: ModelRowProps) {
  return (
    <Fragment>
      <tr className="border-b border-border-soft last:border-0">
        {props.model.columns.map((column) => (
          <RowCell
            key={column.key}
            colKey={column.key}
            row={props.row}
            path={props.model.path}
            editable={props.statusEditable}
            pending={props.pending}
            onStatus={props.onStatus}
          />
        ))}
        {props.actions ? <RowActions {...props.actions} /> : null}
      </tr>
      {props.fichaOpen ? (
        <ExpandedRow span={props.span}>
          <VolunteerFicha row={props.row} onClose={props.onCloseFicha} />
        </ExpandedRow>
      ) : null}
      {props.editOpen && props.model.editFields ? (
        <ExpandedRow span={props.span}>
          <ModelForm
            fields={props.model.editFields}
            initial={props.row}
            submitLabel="Guardar"
            pending={props.pending}
            onCancel={props.onCancelEdit}
            onSubmit={props.onSaveEdit}
          />
        </ExpandedRow>
      ) : null}
    </Fragment>
  );
}
