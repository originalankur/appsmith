import React, { useMemo } from "react";
import styled from "styled-components";
import { Collapse, Classes as BPClasses } from "@blueprintjs/core";
import Icon, { IconSize } from "components/ads/Icon";
import { Classes } from "components/ads/common";
import Text, { TextType } from "components/ads/Text";
import { useState } from "react";
import history from "utils/history";
import { getTypographyByKey } from "constants/DefaultTheme";
import Connections from "./Connections";
import SuggestedWidgets from "./SuggestedWidgets";
import { WidgetType } from "constants/WidgetConstants";
import { ReactNode } from "react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { AppState } from "reducers";
import { getDependenciesFromInverseDependencies } from "../Debugger/helpers";
import {
  getCurrentApplicationId,
  getCurrentPageId,
} from "selectors/editorSelectors";
import { BUILDER_PAGE_URL } from "constants/routes";
import { getWidgets } from "sagas/selectors";

const SideBar = styled.div`
  padding: ${(props) => props.theme.spaces[0]}px
    ${(props) => props.theme.spaces[3]}px ${(props) => props.theme.spaces[4]}px;
  overflow: auto;
  height: 100%;

  & > div {
    margin-top: ${(props) => props.theme.spaces[11]}px;
  }

  .icon-text {
    display: flex;
    margin-left: ${(props) => props.theme.spaces[2] + 1}px;

    .connection-type {
      ${(props) => getTypographyByKey(props, "p1")}
    }
  }

  .icon-text:nth-child(2) {
    padding-top: ${(props) => props.theme.spaces[7]}px;
  }

  .description {
    ${(props) => getTypographyByKey(props, "p1")}
    margin-left: ${(props) => props.theme.spaces[2] + 1}px;
    padding-bottom: ${(props) => props.theme.spaces[7]}px;
  }
`;

const Label = styled.span`
  cursor: pointer;
`;

const CollapsibleWrapper = styled.div<{ isOpen: boolean }>`
  .${BPClasses.COLLAPSE_BODY} {
    padding-top: ${(props) => props.theme.spaces[3]}px;
  }

  & > .icon-text:first-child {
    color: ${(props) => props.theme.colors.actionSidePane.collapsibleIcon};
    ${(props) => getTypographyByKey(props, "h4")}
    cursor: pointer;
    .${Classes.ICON} {
      ${(props) => !props.isOpen && `transform: rotate(-90deg);`}
    }

    .label {
      padding-left: ${(props) => props.theme.spaces[1] + 1}px;
    }
  }
`;

const Placeholder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  height: 100%;
  padding: ${(props) => props.theme.spaces[8]}px;
  text-align: center;
`;

const BackButton = styled.div`
  display: flex;
  cursor: pointer;
  margin-left: ${(props) => props.theme.spaces[1] + 1}px;
  .${Classes.TEXT} {
    margin-left: ${(props) => props.theme.spaces[4] + 1}px;
  }
`;

type CollapsibleProps = {
  expand?: boolean;
  children: ReactNode;
  label: string;
};

export function Collapsible({
  children,
  expand = true,
  label,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(!!expand);

  useEffect(() => {
    setIsOpen(expand);
  }, [expand]);

  return (
    <CollapsibleWrapper isOpen={isOpen}>
      <Label className="icon-text" onClick={() => setIsOpen(!isOpen)}>
        <Icon name="downArrow" size={IconSize.XXS} />
        <span className="label">{label}</span>
      </Label>
      <Collapse isOpen={isOpen} keepChildrenMounted>
        {children}
      </Collapse>
    </CollapsibleWrapper>
  );
}

function ActionSidebar({
  actionName,
  hasResponse,
  suggestedWidgets,
}: {
  actionName: string;
  hasResponse: boolean;
  suggestedWidgets?: WidgetType[];
}) {
  const applicationId = useSelector(getCurrentApplicationId);
  const pageId = useSelector(getCurrentPageId);
  const widgets = useSelector(getWidgets);
  const hasWidgets = Object.keys(widgets).length > 1;

  const deps = useSelector((state: AppState) => state.evaluations.dependencies);
  const entityDependencies = useMemo(
    () =>
      getDependenciesFromInverseDependencies(
        deps.inverseDependencyMap,
        actionName,
      ),
    [actionName, deps.inverseDependencyMap],
  );
  const hasConnections =
    entityDependencies &&
    (entityDependencies?.directDependencies.length > 0 ||
      entityDependencies?.inverseDependencies.length > 0);
  const showSuggestedWidgets =
    hasResponse && suggestedWidgets && !!suggestedWidgets.length;
  const showSnipingMode = hasResponse && hasWidgets;

  if (!hasConnections && !showSuggestedWidgets && !showSnipingMode) {
    return <Placeholder>No connections to show here</Placeholder>;
  }

  const navigeteToCanvas = () => {
    history.push(BUILDER_PAGE_URL(applicationId, pageId));
  };

  return (
    <SideBar>
      <BackButton onClick={navigeteToCanvas}>
        <Icon keepColors name="chevron-left" size={IconSize.XXS} />
        <Text type={TextType.H6}>Back to canvas</Text>
      </BackButton>

      {hasConnections && (
        <Connections
          actionName={actionName}
          entityDependencies={entityDependencies}
        />
      )}
      {showSuggestedWidgets && (
        <SuggestedWidgets
          actionName={actionName}
          hasWidgets={hasWidgets}
          suggestedWidgets={suggestedWidgets as WidgetType[]}
        />
      )}
    </SideBar>
  );
}

export default ActionSidebar;