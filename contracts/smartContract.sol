// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MileageAudit {
    struct Inspection {
        uint256 dashboard;
        uint256 moduleA;
        uint256 moduleB;
        uint256 submittedAt;
        bool flagged;
        uint256 correctedMileage;
        string reviewReason;
        uint256 reviewedAt;
    }

    address private immutable reporter;
    address private immutable reviewer;
    uint256 private acceptedMileage = 95000;
    bool private needsReview;
    Inspection[] private history;

    constructor(address reporterAddress) {
        require(reporterAddress != address(0), "Enter a reporter address");
        require(reporterAddress != msg.sender, "Choose a different account");
        reporter = reporterAddress;
        reviewer = msg.sender;
    }

    function submitInspection(
        uint256 dashboard,
        uint256 moduleA,
        uint256 moduleB
    ) external {
        require(msg.sender == reporter, "Only the reporter can submit");
        require(!needsReview, "Resolve the open review first");

        bool flagged =
            dashboard != moduleA ||
            dashboard != moduleB ||
            dashboard < acceptedMileage;

        history.push(Inspection({
            dashboard: dashboard,
            moduleA: moduleA,
            moduleB: moduleB,
            submittedAt: block.timestamp,
            flagged: flagged,
            correctedMileage: 0,
            reviewReason: "",
            reviewedAt: 0
        }));

        needsReview = flagged;
        if (!flagged) {
            acceptedMileage = dashboard;
        }
    }

    function resolveReview(
        uint256 correctedMileage,
        string calldata reason
    ) external {
        require(msg.sender == reviewer, "Only the reviewer can resolve");
        require(needsReview, "No inspection needs review");
        require(bytes(reason).length > 0, "Enter a reason");

        Inspection storage inspection = history[history.length - 1];
        inspection.correctedMileage = correctedMileage;
        inspection.reviewReason = reason;
        inspection.reviewedAt = block.timestamp;

        acceptedMileage = correctedMileage;
        needsReview = false;
    }

    function getVehicleStatus() external view returns (uint256, bool) {
        return (acceptedMileage, needsReview);
    }

    function getInspectionCount() external view returns (uint256) {
        return history.length;
    }

    function getInspection(uint256 index) external view returns (Inspection memory) {
        return history[index];
    }
}