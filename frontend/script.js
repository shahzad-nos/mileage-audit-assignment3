import { Contract, JsonRpcProvider } from "https://cdn.jsdelivr.net/npm/ethers@6.14.0/+esm";

const message = document.getElementById("message");
const vehicleStatus = document.getElementById("vehicle-status");
const history = document.getElementById("history");
const refreshButton = document.getElementById("refresh");
const inspectionForm = document.getElementById("inspection-form");
const reviewForm = document.getElementById("review-form");
const buttons = document.querySelectorAll("button");

function setBusy(busy) {
  buttons.forEach((button) => {
    button.disabled = busy;
  });
}

function km(value) {
  return `${value.toLocaleString()} km`;
}

async function start() {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const response = await fetch("../build/contracts/MileageAudit.json");
  if (!response.ok) {
    throw new Error("Could not load the Truffle build. Open the page from the project folder's local server.");
  }

  const artifact = await response.json();
  const networkId = await provider.send("net_version", []);
  const deployment = artifact.networks[networkId];

  if (!deployment || await provider.getCode(deployment.address) === "0x") {
    throw new Error("MileageAudit is missing on this Ganache chain. Run the Truffle migration again.");
  }

  const contract = new Contract(deployment.address, artifact.abi, provider);
  const reviewerContract = contract.connect(await provider.getSigner(0));
  const reporterContract = contract.connect(await provider.getSigner(1));

  async function refresh() {
    const [mileage, needsReview] = await contract.getVehicleStatus();
    const count = await contract.getInspectionCount();
    const rows = [];

    for (let index = 0n; index < count; index++) {
      const entry = await contract.getInspection(index);
      const row = document.createElement("li");
      row.textContent =
        `Inspection ${index + 1n}: Dashboard ${km(entry.dashboard)}, ` +
        `Module A ${km(entry.moduleA)}, Module B ${km(entry.moduleB)}.`;

      if (entry.reviewedAt !== 0n) {
        row.textContent +=
          ` Flagged and reviewed. Accepted ${km(entry.correctedMileage)}. ` +
          `Reason: ${entry.reviewReason}`;
      } else if (entry.flagged) {
        row.textContent += " Needs review.";
      }

      rows.push(row);
    }

    const status = needsReview ? "Needs review" : "No open review";
    vehicleStatus.textContent = `Accepted mileage: ${km(mileage)} · ${status}`;
    history.replaceChildren(...rows);
  }

  async function run(action) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      message.textContent = error.reason || error.shortMessage || error.message;
    } finally {
      setBusy(false);
    }
  }

  function handleTransaction(form, send) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = new FormData(form);

      run(async () => {
        message.textContent = "Sending transaction to Ganache…";
        const transaction = await send(fields);
        await transaction.wait();
        await refresh();
        message.textContent = `Transaction confirmed in Ganache: ${transaction.hash}`;
      });
    });
  }

  refreshButton.addEventListener("click", () => run(refresh));

  handleTransaction(inspectionForm, (fields) =>
    reporterContract.submitInspection(
      BigInt(fields.get("dashboard")),
      BigInt(fields.get("moduleA")),
      BigInt(fields.get("moduleB"))
    )
  );

  handleTransaction(reviewForm, (fields) =>
    reviewerContract.resolveReview(
      BigInt(fields.get("mileage")),
      fields.get("reason").trim()
    )
  );

  await refresh();
  message.textContent = "Connected to Ganache.";
  setBusy(false);
}

setBusy(true);
start().catch((error) => {
  message.textContent = error.shortMessage || error.message;
});