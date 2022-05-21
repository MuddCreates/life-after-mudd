import { State, SidebarView } from "../../lib/state";
import { Response } from "../../lib/response";

import { useDispatch, useSelector } from "../../hooks/redux";

const arrayify =
  <T,>(fn: (r: Response) => T | T[]) =>
  (response: Response) => {
    const vals = fn(response);
    if (!vals) return null;
    if (!Array.isArray(vals)) return [vals];
    if (vals.length === 0) return null;
    return vals;
  };

export const DetailItem = ({
  response,
  icon,
  field,
  match,
  matchSummer,
  forcePredicate,
  separator,
  noLink,
  sidebarView,
  href,
  brand,
}: {
  response: Response;
  icon: string;
  field: (r: Response) => string;
  href: string;
  brand: boolean;
}) => {
  const dispatch = useDispatch();

  const responses = useSelector((state) => state.responses);

  const fields = arrayify(field);
  const matches = arrayify(match || field);
  const matchesSummer = matchSummer && arrayify(matchSummer);
  return (
    fields(response) && (
      <p
        style={{
          marginBottom: "8px",
        }}
      >
        <span
          className={`${brand ? "fab" : "fas"} fa-${icon}`}
          style={{
            paddingRight: "10px",
            width: "30px",
            textAlign: "center",
          }}
        ></span>{" "}
        {fields(response)?.map((val, idx) => (
          <span
            key={idx}
            style={{
              display: "inline-block",
            }}
          >
            {idx !== 0 && (
              <span
                style={{
                  whiteSpace: "pre",
                }}
              >
                {separator}
              </span>
            )}
            {noLink ? (
              val
            ) : (
              <a
                href={href || "#"}
                target={href ? "_blank" : undefined}
                onClick={
                  href
                    ? null
                    : (e) => {
                        e.preventDefault();
                        dispatch({
                          type: "SHOW_DETAILS",
                          responses: responses
                            .map((response) => {
                              let showLongTerm =
                                (matches(response) &&
                                  matches(response).includes(val)) ||
                                (forcePredicate && forcePredicate(response));
                              let showSummer =
                                (matchesSummer &&
                                  matchesSummer(response) &&
                                  matchesSummer(response).includes(val)) ||
                                (forcePredicate &&
                                  forcePredicate(response) &&
                                  !(
                                    response.orgLatLong || response.cityLatLong
                                  ));
                              if (showLongTerm || showSummer) {
                                return {
                                  ...response,
                                  showLongTerm,
                                  showSummer,
                                };
                              } else {
                                return null;
                              }
                            })
                            .filter((x) => x),
                          sidebarView: sidebarView || SidebarView.summaryView,
                        });
                        dispatch({
                          type: "UPDATE_MAP_VIEW_ZOOM",
                        });
                      }
                }
              >
                {val}
              </a>
            )}
          </span>
        ))}
      </p>
    )
  );
};
