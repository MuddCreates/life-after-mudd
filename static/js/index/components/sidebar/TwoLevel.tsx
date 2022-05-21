import _ from "lodash";
import { Response } from "../../lib/response";
import { useDispatch, useSelector } from "../../hooks/redux";
import { ActionType } from "../../lib/action";
import { SidebarView } from "../../lib/state";
import * as React from "react";

export interface GroupBy {
  (resp: Response): {
    key: string;
    summerKey: string;
    icon: string;
    summerIcon: string;
    noLinkForSummer: boolean;
    sortAs: (val: string) => [boolean, boolean, string[]];
  };
}

function groupData(
  responses: Response[],
  getFirstKey: GroupBy,
  getSecondKey: GroupBy,
) {
  const index: Record<string, Record<string, unknown[]>> = {};
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

        index[firstKey][secondKey].push({ resp, summer });
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
          ({ resp }) => resp.name,
        ),
      })),
    }),
  );
}

const useSimpleSearch = () => {
  const dispatch = useDispatch();
  const responses = useSelector((state) => state.displayedResponses);

  return (searchGetter: GroupBy, searchValue: string, view: SidebarView) => {
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
    dispatch({
      type: ActionType.updateMapViewZoom,
    });
  };
};

const TwoLevel = (props: {
  firstKeyView: SidebarView;
  secondKeyView: SidebarView;
  firstGroupBy: GroupBy;
  secondGroupBy: GroupBy;
}) => {
  const responses = useSelector((state) => state.displayedResponses);

  const doSimpleSearch = useSimpleSearch();

  const dispatch = useDispatch();

  const groupedData = groupData(
    responses,
    props.firstGroupBy,
    props.secondGroupBy,
  );
  return (
    <>
      {groupedData.map(
        ({ firstKey, firstIcon, noLinkFirst, secondKeys }, idx) => (
          <React.Fragment key={idx}>
            <p
              style={{
                fontSize: "120%",
                paddingTop: idx === 0 ? "0px" : "16px",
              }}
            >
              <span
                className={`fas fa-${firstIcon}`}
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
                {noLinkFirst ? (
                  firstKey
                ) : (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      doSimpleSearch(
                        props.firstGroupBy,
                        firstKey,
                        props.firstKeyView,
                      );
                    }}
                  >
                    {firstKey}
                  </a>
                )}
              </b>
            </p>
            {secondKeys.map(
              ({ secondKey, secondIcon, noLinkSecond, responses }, idx) => (
                <React.Fragment key={idx}>
                  <p
                    style={{
                      marginBottom: "0px",
                    }}
                  >
                    <span
                      className={`fas fa-${secondIcon}`}
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
                      {noLinkSecond ? (
                        secondKey
                      ) : (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            doSimpleSearch(
                              props.secondGroupBy,
                              secondKey,
                              props.secondKeyView,
                            );
                          }}
                        >
                          {secondKey}
                        </a>
                      )}
                    </span>
                  </p>
                  {responses.map(({ resp, summer }, idx) => {
                    return (
                      <React.Fragment key={idx}>
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
                                responses: [resp],
                                sidebarView: SidebarView.detailView,
                              });
                              dispatch({
                                type: ActionType.updateMapViewZoom,
                              });
                            }}
                          >
                            {resp.name || "Anonymous"}
                          </a>
                          <i
                            style={{
                              fontSize: "75%",
                            }}
                          >
                            {summer && " (for the summer)"}
                          </i>
                        </p>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ),
            )}
          </React.Fragment>
        ),
      )}
    </>
  );
};

export default TwoLevel;
