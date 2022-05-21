import * as Css from "./Sidebar.module.css";

import TwoLevel, { GroupBy } from "./sidebar/TwoLevel";
import DetailView, { getPathIcon } from "./sidebar/DetailView";

import { useSelector } from "../hooks/redux";
import { SidebarView } from "../lib/state";
import { formatCity, formatLongTermPlan, formatSummerPlan } from "../tag";

const locationGroupBy: GroupBy<[boolean, boolean, string[]]> = (resp) => ({
  key: formatCity(resp.city, resp.state, resp.country) || "Location unknown",
  summerKey:
    formatCity(resp.summerCity, resp.summerState, resp.summerCountry) ||
    (resp.summerPlans && "Location unknown"),
  icon: "globe-americas",
  summerIcon: "globe-americas",
  noLinkForSummer: false,
  sortAs: (val) => [
    val === "Location unknown",
    val.split(", ").length > 2,
    val.split(", ").reverse(),
  ],
});

const orgGroupBy: GroupBy<[boolean, boolean, boolean, string]> = (resp) => ({
  key: formatLongTermPlan(resp),
  summerKey: formatSummerPlan(resp),
  icon: getPathIcon({ path: resp.path, summer: false }),
  summerIcon: "calendar-check",
  noLinkForSummer: !resp.summerOrg,
  sortAs: (val) => [
    !val.startsWith("Working"),
    !val.startsWith("Studying"),
    !val.startsWith("Gap year"),
    val,
  ],
});

const SidebarBody = () => {
  const responses = useSelector((state) => state.displayedResponses);
  const sidebarView = useSelector((state) => state.sidebarView);

  switch (sidebarView) {
    case SidebarView.detailView:
      return (
        <>
          {responses.map((resp) => (
            <DetailView key={resp.idx} response={resp} />
          ))}
        </>
      );

    case SidebarView.summaryView:
      return (
        <TwoLevel
          firstKeyView={SidebarView.summaryView}
          secondKeyView={SidebarView.organizationView}
          firstGroupBy={locationGroupBy}
          secondGroupBy={orgGroupBy}
        />
      );

    case SidebarView.organizationView:
      return (
        <TwoLevel
          firstKeyView={SidebarView.organizationView}
          secondKeyView={SidebarView.summaryView}
          firstGroupBy={orgGroupBy}
          secondGroupBy={locationGroupBy}
        />
      );
  }
};

const Sidebar = () => {
  // The div after the body is a hack because padding-bottom doesn't
  // seem to be respected on Android(??).
  //
  // Add class "hint-scrollable" here when it's time to fix up and
  // re-add the drop shadow.
  return (
    <div className={Css.sidebar}>
      <SidebarBody />
      <div style={{ height: "10px" }}></div>
    </div>
  );
};

export default Sidebar;
