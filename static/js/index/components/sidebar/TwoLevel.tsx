import _ from "lodash";
import { Response } from "../../lib/response";
import { useDispatch, useSelector } from "../../hooks/redux";
import { ActionType } from "../../lib/action";
import { SidebarView } from "../../lib/state";
import * as React from "react";

export interface GroupBy<SortKey> {
  (resp: Response): {
    key: string;
    summerKey: string;
    icon: string;
    summerIcon: string;
    noLinkForSummer: boolean;
    sortAs: (val: string) => SortKey;
  };
}

function groupData<T1, T2>(
  responses: Response[],
  getFirstKey: GroupBy<T1>,
  getSecondKey: GroupBy<T2>,
) {
  const index: Record<
    string,
    Record<string, { response: Response; summer: boolean }[]>
  > = {};
  const firstIconIndex: Record<string, { icon: string; noLink: boolean }> = {};
  const secondIconIndex: typeof firstIconIndex = {};
  const firstSortIndex: Record<string, unknown> = {};
  const secondSortIndex: Record<string, unknown> = {};
  for (const resp of responses) {
    const {
      key: theFirstKey,
      summerKey: firstSummerKey,
      icon: theFirstIcon,
      summerIcon: firstSummerIcon,
      noLinkForSummer: noLinkForSummerFirst,
      sortAs: firstSortAs,
    } = getFirstKey(resp);
    const {
      key: theSecondKey,
      summerKey: secondSummerKey,
      icon: theSecondIcon,
      summerIcon: secondSummerIcon,
      noLinkForSummer: noLinkForSummerSecond,
      sortAs: secondSortAs,
    } = getSecondKey(resp);

    for (const [
      firstKey,
      secondKey,
      firstIcon,
      secondIcon,
      noLinkFirst,
      noLinkSecond,
      summer,
    ] of [
      [
        theFirstKey,
        theSecondKey,
        theFirstIcon,
        theSecondIcon,
        false,
        false,
        false,
      ],
      [
        firstSummerKey,
        secondSummerKey,
        firstSummerIcon,
        secondSummerIcon,
        noLinkForSummerFirst,
        noLinkForSummerSecond,
        true,
      ],
    ] as const) {
      if (!(firstKey && secondKey)) {
        continue;
      }
      if (
        (!summer &&
          (!resp.hasOwnProperty("showLongTerm") || resp.showLongTerm)) ||
        (summer && (!resp.hasOwnProperty("showSummer") || resp.showSummer))
      ) {
        if (!index[firstKey]) index[firstKey] = {};
        if (!index[firstKey][secondKey]) index[firstKey][secondKey] = [];

        index[firstKey][secondKey].push({ response: resp, summer });
        firstIconIndex[firstKey] = { icon: firstIcon, noLink: noLinkFirst };
        secondIconIndex[secondKey] = { icon: secondIcon, noLink: noLinkSecond };
        firstSortIndex[firstKey] = firstSortAs(firstKey);
        secondSortIndex[secondKey] = secondSortAs(secondKey);
      }
    }
  }
  return _.sortBy(Object.keys(index), (val) => firstSortIndex[val]).map(
    (firstKey) => ({
      firstKey,
      firstIcon: firstIconIndex[firstKey].icon,
      noLinkFirst: firstIconIndex[firstKey].noLink,
      secondKeys: _.sortBy(
        Object.keys(index[firstKey]),
        (val) => secondSortIndex[val],
      ).map((secondKey) => ({
        secondKey,
        secondIcon: secondIconIndex[secondKey].icon,
        noLinkSecond: secondIconIndex[secondKey].noLink,
        responses: _.sortBy(
          index[firstKey][secondKey],
          ({ response }) => response.name,
        ),
      })),
    }),
  );
}

const useSimpleSearch = () => {
  const dispatch = useDispatch();
  const responses = useSelector((state) => state.displayedResponses);

  return <T,>(
    searchGetter: GroupBy<T>,
    searchValue: string,
    view: SidebarView,
  ) => {
    if (responses === null) return;

    dispatch({
      type: "SHOW_DETAILS",
      responses: responses
        .map((resp) => {
          const showLongTerm = searchGetter(resp).key === searchValue;
          const showSummer = searchGetter(resp).summerKey === searchValue;
          if (showLongTerm || showSummer) {
            return { ...resp, showLongTerm, showSummer };
          } else {
            return null;
          }
        })
        .filter((x) => x),
      sidebarView: view,
    });
    dispatch({ type: ActionType.updateMapViewZoom });
  };
};

const LevelCoarse = <T1, T2>(props: {
  firstGroupBy: GroupBy<T1>;
  secondGroupBy: GroupBy<T2>;
  firstKeyView: SidebarView;
  secondKeyView: SidebarView;
  firstKey: string;
  firstIcon: string;
  noLinkFirst: boolean;
  secondKeys: {
    noLinkSecond: boolean;
    secondKey: string;
    secondIcon: string;
    responses: { response: Response; summer: boolean }[];
  }[];
}) => {
  const doSimpleSearch = useSimpleSearch();
  return (
    <>
      <p style={{ fontSize: "120%" }}>
        <span
          className={`fas fa-${props.firstIcon}`}
          style={{
            marginRight: "10px",
            textAlign: "center",
            width: "30px",
          }}
        ></span>
        <b
          style={{
            display: "inline-block",
          }}
        >
          {props.noLinkFirst ? (
            props.firstKey
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                doSimpleSearch(
                  props.firstGroupBy,
                  props.firstKey,
                  props.firstKeyView,
                );
              }}
            >
              {props.firstKey}
            </a>
          )}
        </b>
      </p>
      {props.secondKeys.map((p, idx) => (
        <LevelFine
          key={idx}
          keyView={props.secondKeyView}
          groupBy={props.secondGroupBy}
          {...p}
        />
      ))}
    </>
  );
};

const LevelFine = <T,>(props: {
  keyView: SidebarView;
  groupBy: GroupBy<T>;
  secondKey: string;
  secondIcon: string;
  noLinkSecond: boolean;
  responses: { response: Response; summer: boolean }[];
}) => {
  const doSimpleSearch = useSimpleSearch();

  return (
    <>
      <p style={{ marginBottom: "0px" }}>
        <span
          className={`fas fa-${props.secondIcon}`}
          style={{
            marginLeft: `43px`,
            marginRight: "10px",
            textAlign: "center",
            width: "16px",
          }}
        ></span>
        <span
          style={{
            display: "inline-block",
          }}
        >
          {props.noLinkSecond ? (
            props.secondKey
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                doSimpleSearch(props.groupBy, props.secondKey, props.keyView);
              }}
            >
              {props.secondKey}
            </a>
          )}
        </span>
      </p>
      {props.responses.map((ps, idx) => (
        <Entry key={idx} {...ps} />
      ))}
    </>
  );
};

const Entry = (props: { response: Response; summer: boolean }) => {
  const dispatch = useDispatch();

  return (
    <p
      style={{
        marginBottom: "0px",
      }}
    >
      <span
        className={`fas fa-user-graduate`}
        style={{
          paddingLeft: `85px`,
          paddingRight: "10px",
          display: "inline-block",
        }}
      ></span>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          dispatch({
            type: ActionType.showDetails,
            responses: [props.response],
            sidebarView: SidebarView.detailView,
          });
          dispatch({
            type: ActionType.updateMapViewZoom,
          });
        }}
      >
        {props.response.name || "Anonymous"}
      </a>
      <i
        style={{
          fontSize: "75%",
        }}
      >
        {props.summer && " (for the summer)"}
      </i>
    </p>
  );
};

const TwoLevel = <T1, T2>(props: {
  firstKeyView: SidebarView;
  secondKeyView: SidebarView;
  firstGroupBy: GroupBy<T1>;
  secondGroupBy: GroupBy<T2>;
}) => {
  const responses = useSelector((state) => state.displayedResponses);

  const groupedData = groupData(
    responses,
    props.firstGroupBy,
    props.secondGroupBy,
  );

  return (
    <>
      {groupedData.map((ps, idx) => (
        <LevelCoarse key={idx} {...props} {...ps} />
      ))}
    </>
  );
};

export default TwoLevel;
