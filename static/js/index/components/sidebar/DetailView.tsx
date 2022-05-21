import { Response } from "../../lib/response";
import { DetailItem } from "./DetailItem";

import { useSelector } from "$/hooks/redux";
import { SidebarView } from "../../lib/state";
import {
  formatCity,
  formatCitySuffix,
  formatLongTermPlan,
  formatSummerPlan,
} from "../../tag";

export function getPathIcon({
  path,
  summer,
}: {
  path: string;
  summer: boolean;
}) {
  if (path.endsWith("at home")) {
    return "home";
  }
  switch (path) {
    case "Job":
    case "Internship":
      return "building";
    case "Graduate school":
      return "university";
    case "Gap year":
      return "route";
    case "Not sure":
      return "question";
    default:
      return summer ? "calendar-check" : "building";
  }
}

const DetailView = (props: { response: Response }) => {
  const email = useSelector((s) => s.email);

  return (
    <div
      style={{
        paddingLeft: "3px",
      }}
    >
      <h5>
        <b>{props.response.name || "Anonymous"}</b>
      </h5>
      {DetailItem({
        response: props.response,
        icon: "graduation-cap",
        field: (r) => r.major && r.major.split(" + "),
        separator: " + ",
      })}
      {DetailItem({
        response: props.response,
        icon: "globe-americas",
        field: (response) =>
          formatCity(response.city, response.state, response.country),
        matchSummer: (response) =>
          formatCity(
            response.summerCity,
            response.summerState,
            response.summerCountry,
          ),
      })}
      {DetailItem({
        response: props.response,
        icon: getPathIcon({ path: props.response.path, summer: false }),
        field: formatLongTermPlan,
        matchSummer: formatSummerPlan,
        forcePredicate: (other) =>
          !props.response.org && props.response.path === other.path,
        sidebarView: SidebarView.organizationView,
      })}
      {DetailItem({
        response: props.response,
        icon: "link",
        field: (r) => r.orgLink,
        href: props.response.orgLink,
      })}
      {(props.response.summerPlans ||
        props.response.summerCity ||
        props.response.summerState ||
        props.response.summerCountry ||
        props.response.summerOrg) && (
        <>
          <p
            style={{
              marginTop: "25px",
              marginBottom: "8px",
            }}
          >
            <b>Summer plans</b>
          </p>
          {DetailItem({
            response: props.response,
            icon: getPathIcon({
              path: props.response.summerPlans,
              summer: true,
            }),
            field: formatSummerPlan,
            match: formatLongTermPlan,
            matchSummer: formatSummerPlan,
            noLink: !props.response.summerOrg,
          })}
          {DetailItem({
            response: props.response,
            icon: "globe-americas",
            field: (response) =>
              formatCity(
                response.summerCity,
                response.summerState,
                response.summerCountry,
              ),
            match: (response) =>
              formatCity(response.city, response.state, response.country),
            matchSummer: (response) =>
              formatCity(
                response.summerCity,
                response.summerState,
                response.summerCountry,
              ),
          })}
          {DetailItem({
            response: props.response,
            icon: "link",
            field: (response) => response.summerOrgLink,
            href: props.response.summerOrgLink,
          })}
        </>
      )}
      {props.response.comments && (
        <p
          style={{
            marginTop: "55px",
          }}
        >
          <span
            style={{
              position: "absolute",
            }}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: "400%",
                position: "absolute",
                top: "-45px",
              }}
            >
              &ldquo;
            </span>
          </span>
          <span>{props.response.comments}</span>
        </p>
      )}
      <p
        style={{
          marginTop: "25px",
          marginBottom: "8px",
        }}
      >
        <b>Contact</b>
      </p>
      {DetailItem({
        response: props.response,
        icon: "inbox",
        field: (r) => r.postGradEmail,
        href: `mailto:${props.response.postGradEmail}`,
      })}
      {DetailItem({
        response: props.response,
        icon: "phone",
        field: (r) => r.phoneNumber,
        href: `tel:${props.response.phoneNumber}`,
      })}
      {DetailItem({
        response: props.response,
        icon: "facebook-messenger",
        field: (response) => response.facebookProfile && "Facebook profile",
        href: props.response.facebookProfile,
        brand: true,
      })}
      {(props.response.email === email || email === "*") && (
        <>
          <p
            style={{
              marginTop: "25px",
              marginBottom: "8px",
            }}
          >
            <b>Update your response</b>
          </p>
          <p>
            To update your information, simply{" "}
            <a href="https://forms.gle/PqEHTjpBDGBXfH4W8" target="_blank">
              fill out the form again
            </a>
            .
            {!props.response.comments &&
              props.response.path !== "Not sure" &&
              !props.response.path.endsWith("at home") && (
                <>
                  {" "}
                  <i>
                    Why not update the comments section to tell people{" "}
                    {props.response.path === "Job"
                      ? "what you'll be doing at " +
                        (props.response.org || "your new job")
                      : props.response.path === "Graduate school"
                      ? "what program you'll be enrolled in at " +
                        (props.response.org.startsWith("University")
                          ? "the "
                          : "") +
                        (props.response.org || "grad school")
                      : props.response.path === "Gap year"
                      ? "what you'll be doing during your gap year" +
                        formatCitySuffix(props.response.city)
                      : props.response.org
                      ? "what you'll be up to at " + props.response.org
                      : "what you'll be up to" +
                        formatCitySuffix(props.response.city)}
                    ?
                  </i>
                </>
              )}
          </p>
          <p>
            If you want to be removed from the map, or you have any other
            concerns, just{" "}
            <a href="mailto:rrosborough@hmc.edu" target="_blank">
              shoot me an email
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
};

export default DetailView;
