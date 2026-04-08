const ProposalData = () => {
  const data = {
    "proposalSetting": {
        "branding": {
            "brandName": "Bayshore",
            "linkPrefix": "bayshrore",
            "defaultFont": "Poppins",
            "signatureColor": "#5C93A3",
            "logoFile": "https://bayshore.nyc3.digitaloceanspaces.com/DXG-RFP-Tool/settings/69afe2955de8b350aa06e0f9/logo-1774936296637.png"
        },
        "proposals": {
            "contacts": {
                "email": {
                    "enabled": true,
                    "value": "ui.abukawsar@gmail.com"
                },
                "call": {
                    "enabled": true,
                    "value": "+12163547758ujkl"
                }
            },
            "proposalLanguage": "English",
            "defaultCurrency": "$",
            "expiryDate": "14 Days",
            "priceSeparator": ",",
            "dateFormat": "YYYY-MM-DD",
            "decimalPrecision": "2",
            "downloadPreview": "Yes",
            "teammateEmail": "arsahak.bayshore@gmail.com"
        },
        "signatures": {
            "signatureType": "Upload",
            "signatureImageUrl": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzEzIiBoZWlnaHQ9IjE3NCIgdmlld0JveD0iMCAwIDMxMyAxNzQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMTIuMjEyIiBoZWlnaHQ9IjE3NCIgcng9IjEyIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMjcxLjQ3MyAxMDEuOThDMjQ3Ljc3MyAxMDAuMjggMjIzLjk3MyAxMDAuNDggMjAwLjE3MyAxMDEuMjhDMjA2LjM3MyA5NS4zODAzIDIxMi45NzMgOTAuMjgwMyAyMjAuOTczIDg3LjI4MDNDMjIxLjM3MyA4Ny4xODAzIDIyMS44NzMgODcuMTgwMyAyMjIuMjczIDg3LjA4MDNDMjIyLjI3MyA4Ny4wODAzIDIyMi4yNzMgODcuMTgwMyAyMjIuMTczIDg3LjE4MDNDMjIyLjA3MyA4Ny4zODAzIDIyMi4zNzMgODcuNDgwMyAyMjIuNDczIDg3LjI4MDNDMjIyLjU3MyA4Ny4xODAzIDIyMi41NzMgODcuMDgwMyAyMjIuNjczIDg2Ljk4MDNDMjIyLjk3MyA4Ni45ODAzIDIyMy4yNzMgODYuODgwMyAyMjMuNTczIDg2Ljg4MDNDMjI0LjM3MyA4Ni43ODAzIDIyNC4zNzMgODUuNjgwMyAyMjMuNTczIDg1LjY4MDNDMjE4LjM3MyA4NS4zODAzIDIxMy4yNzMgODYuODgwMyAyMDguMTczIDg3LjM4MDNDMjA4LjM3MyA4Ny4wODAzIDIwOC41NzMgODYuODgwMyAyMDguNzczIDg2LjU4MDNDMjA5LjM3MyA4NS44ODAzIDIwOC43NzMgODQuNTgwMyAyMDcuNzczIDg0Ljk4MDNDMjA0LjU3MyA4Ni4xODAzIDIwMC42NzMgODcuODgwMyAxOTcuMDczIDg3LjQ4MDNDMTk3LjQ3MyA4Ny4xODAzIDE5Ny44NzMgODYuODgwMyAxOTguMzczIDg2LjY4MDNDMTk5LjM3MyA4Ni4xODAzIDE5OC42NzMgODQuODgwMyAxOTcuNzczIDg0Ljg4MDNDMTkyLjI3MyA4NC42ODAzIDE4Ny4wNzMgODYuNDgwMyAxODEuNjczIDg3LjI4MDNDMTgxLjY3MyA4Ny4yODAzIDE4MS42NzMgODcuMjgwMyAxODEuNzczIDg3LjE4MDNDMTgyLjM3MyA4Ni41ODAzIDE4MS44NzMgODUuNDgwMyAxODEuMDczIDg1LjU4MDNDMTc2LjQ3MyA4NS44ODAzIDE3Mi4xNzMgODguNjgwMyAxNjcuNTczIDg4LjY4MDNDMTY3Ljc3MyA4OC40ODAzIDE2OC4wNzMgODguMjgwMyAxNjguMjczIDg4LjA4MDNDMTY4Ljc3MyA4Ny41ODAzIDE2OC40NzMgODYuNTgwMyAxNjcuNzczIDg2LjQ4MDNDMTYwLjU3MyA4NS4zODAzIDE1My44NzMgOTAuMzgwMyAxNDYuODczIDg5Ljc4MDNDMTQ3LjM3MyA4OS4zODAzIDE0Ny43NzMgODguOTgwMyAxNDguMjczIDg4LjQ4MDNDMTQ4Ljg3MyA4Ny44ODAzIDE0OC4zNzMgODYuODgwMyAxNDcuNTczIDg2Ljg4MDNDMTQxLjI3MyA4Ny4xODAzIDEzNS40NzMgOTAuMDgwMyAxMjkuMzczIDkwLjg4MDNDMTMwLjU3MyA5MC4xODAzIDEzMS43NzMgODkuMzgwMyAxMzIuNzczIDg4LjE4MDNDMTMzLjI3MyA4Ny41ODAzIDEzMi45NzMgODYuNTgwMyAxMzIuMDczIDg2LjY4MDNDMTI0LjE3MyA4Ni45ODAzIDExNy4xNzMgOTEuODgwMyAxMDkuNDczIDkyLjY4MDNDMTEzLjI3MyA5MC42ODAzIDExNy4xNzMgODguODgwMyAxMjAuODczIDg2LjU4MDNDMTIxLjU3MyA4Ni4wODAzIDEyMS4yNzMgODQuODgwMyAxMjAuMzczIDg0Ljg4MDNDMTA4LjA3MyA4NS43ODAzIDk2LjU3MjUgOTAuODgwMyA4NS40NzI1IDk2LjE4MDNDOTYuNTcyNSA4Ny43ODAzIDEwOS4xNzMgODEuNjgwMyAxMjIuMjczIDc2Ljg4MDNDMTIzLjA3MyA3Ni41ODAzIDEyMi44NzMgNzUuMjgwMyAxMjIuMDczIDc1LjM4MDNDMTE0LjA3MyA3Ni4yODAzIDEwNi4wNzMgNzcuNDgwMyA5OC4xNzI1IDc5LjE4MDNDMTA4LjA3MyA3MS4yODAzIDExOC4wNzMgNjMuMDgwMyAxMjcuNzczIDU0LjU4MDNDMTQwLjA3MyA1Mi44ODAzIDE1Mi41NzMgNTIuMjgwMyAxNjQuOTczIDUxLjk4MDNDMTkxLjM3MyA1MS4zODAzIDIxNy44NzMgNTIuNDgwMyAyNDQuMjczIDUwLjY4MDNDMjQ0LjU3MyA1MC42ODAzIDI0NC41NzMgNTAuMjgwMyAyNDQuMjczIDUwLjI4MDNDMjE3LjM3MyA1MS40ODAzIDE5MC40NzMgNDkuODgwMyAxNjMuNTczIDUwLjM4MDNDMTUyLjM3MyA1MC41ODAzIDE0MS4xNzMgNTEuMTgwMyAxMjkuOTczIDUyLjU4MDNDMTMyLjA3MyA1MC42ODAzIDEzNC4yNzMgNDguNzgwMyAxMzYuMzczIDQ2Ljg4MDNDMTM2LjU3MyA0Ni42ODAzIDEzNi4yNzMgNDYuNDgwMyAxMzYuMDczIDQ2LjU4MDNDMTMzLjc3MyA0OC41ODAzIDEzMS40NzMgNTAuNjgwMyAxMjkuMDczIDUyLjY4MDNDMTI3LjQ3MyA1Mi44ODAzIDEyNS44NzMgNTMuMDgwMyAxMjQuMjczIDUzLjI4MDNDMTExLjE3MyA1NS4yODAzIDk3LjU3MjUgNTYuNDgwMyA4NC43NzI1IDYwLjU4MDNDODQuMDcyNSA2MC43ODAzIDg0LjM3MjUgNjEuNzgwMyA4NS4wNzI1IDYxLjY4MDNDOTguMzcyNSA1OC4wODAzIDExMi4xNzMgNTYuNzgwMyAxMjUuNzczIDU0Ljg4MDNDMTI2LjE3MyA1NC43ODAzIDEyNi40NzMgNTQuNzgwMyAxMjYuODczIDU0Ljc4MDNDMTE2Ljc3MyA2My4zODAzIDEwNi4zNzMgNzEuNzgwMyA5NS43NzI1IDc5Ljc4MDNDOTQuMDcyNSA4MC4xODAzIDkyLjM3MjUgODAuNTgwMyA5MC42NzI1IDgxLjA4MDNDODUuNTcyNSA4Mi40ODAzIDgwLjQ3MjUgODQuMDgwMyA3NS40NzI1IDg1Ljg4MDNDNzIuOTcyNSA4Ni41ODAzIDcwLjY3MjUgODcuNTgwMyA2OC4yNzI1IDg4LjU4MDNDNjcuNDcyNSA4OC45ODAzIDY2LjY3MjUgODkuMjgwMyA2NS44NzI1IDg5LjY4MDNDNjQuOTcyNSA5MC4wODAzIDY0Ljc3MjUgOTAuMzgwMyA2NC44NzI1IDkwLjQ4MDNDNjQuNDcyNSA5MC41ODAzIDY0LjE3MjUgOTAuNjgwMyA2My43NzI1IDkwLjg4MDNDNjMuNDcyNSA5MC45ODAzIDYzLjU3MjUgOTEuNDgwMyA2My45NzI1IDkxLjM4MDNDNzMuNTcyNSA4Ny42ODAzIDgzLjE3MjUgODQuMzgwMyA5Mi45NzI1IDgxLjc4MDNDOTEuMzcyNSA4Mi45ODAzIDg5Ljg3MjUgODQuMDgwMyA4OC4yNzI1IDg1LjE4MDNDODAuMDcyNSA5MS4wODAzIDcxLjc3MjUgOTYuNzgwMyA2My4xNzI1IDEwMi4yOEM1NS4yNzI1IDEwNy4yOCA0Ny4zNzI1IDExMi4yOCA0MC42NzI1IDExOC44OEMzOS44NzI1IDExOS42OCA0MS4wNzI1IDEyMC42OCA0MS44NzI1IDEyMC4wOEM0Mi44NzI1IDExOS4yOCA0My45NzI1IDExOC42OCA0NC44NzI1IDExNy43OEM0NS4wNzI1IDExNy41OCA0NC45NzI1IDExNy4zOCA0NC44NzI1IDExNy4xOEM1MS4wNzI1IDExMS42OCA1OC4wNzI1IDEwNy4wOCA2NC45NzI1IDEwMi41OEM3My40NzI1IDk2Ljk4MDMgODEuNzcyNSA5MS4xODAzIDg5Ljg3MjUgODUuMTgwM0M5MS42NzI1IDgzLjg4MDMgOTMuMzcyNSA4Mi41ODAzIDk1LjE3MjUgODEuMTgwM0MxMDEuODczIDc5LjQ4MDMgMTA4LjY3MyA3OC4xODAzIDExNS41NzMgNzcuMzgwM0MxMDIuMDczIDgyLjQ4MDMgODkuMDcyNSA4OS44ODAzIDc4LjI3MjUgOTkuMzgwM0M3Ny40NzI1IDEwMC4wOCA3OC41NzI1IDEwMS4wOCA3OS4zNzI1IDEwMC43OEM5MC45NzI1IDk1LjI4MDMgMTAyLjk3MyA4OS4wODAzIDExNS44NzMgODcuMDgwM0MxMTIuMjczIDg4Ljk4MDMgMTA4LjY3MyA5MC41ODAzIDEwNS4xNzMgOTIuNjgwM0MxMDQuMzczIDkzLjE4MDMgMTA0Ljg3MyA5NC4yODAzIDEwNS42NzMgOTQuMzgwM0MxMTQuMDczIDk1LjA4MDMgMTIxLjE3MyA4OS44ODAzIDEyOS4xNzMgODguNTgwM0MxMjcuODczIDg5LjQ4MDMgMTI2LjM3MyA5MC4xODAzIDEyNS4xNzMgOTEuMDgwM0MxMjQuNDczIDkxLjY4MDMgMTI0Ljc3MyA5Mi43ODAzIDEyNS42NzMgOTIuNzgwM0MxMzIuMjczIDkyLjk4MDMgMTM4LjI3MyA4OS45ODAzIDE0NC42NzMgODguODgwM0MxNDQuMzczIDg5LjA4MDMgMTQ0LjE3MyA4OS4yODAzIDE0My45NzMgODkuNTgwM0MxNDMuNDczIDkwLjA4MDMgMTQzLjc3MyA5MC45ODAzIDE0NC40NzMgOTEuMDgwM0MxNTEuNTczIDkyLjc4MDMgMTU4LjE3MyA4Ny44ODAzIDE2NS4xNzMgODcuODgwM0MxNjQuOTczIDg4LjA4MDMgMTY0Ljc3MyA4OC4yODAzIDE2NC40NzMgODguNDgwM0MxNjMuOTczIDg4Ljk4MDMgMTY0LjI3MyA4OS45ODAzIDE2NC45NzMgOTAuMDgwM0MxNjkuNTczIDkwLjk4MDMgMTczLjU3MyA4OC44ODAzIDE3Ny44NzMgODcuNzgwM0MxNzcuNDczIDg4LjM4MDMgMTc3Ljk3MyA4OS4yODAzIDE3OC43NzMgODkuMjgwM0MxODMuODczIDg4Ljk4MDMgMTg4Ljc3MyA4Ny4zODAzIDE5My43NzMgODYuNzgwM0MxOTMuMjczIDg3LjE4MDMgMTkzLjE3MyA4OC4xODAzIDE5My44NzMgODguNDgwM0MxOTcuNjczIDg5Ljk4MDMgMjAxLjY3MyA4OC45ODAzIDIwNS4zNzMgODcuNjgwM0MyMDQuOTczIDg4LjI4MDMgMjA1LjI3MyA4OS4zODAzIDIwNi4xNzMgODkuMjgwM0MyMTAuMjczIDg5LjA4MDMgMjE0LjI3MyA4OC4yODAzIDIxOC4zNzMgODcuNTgwM0MyMTcuNjczIDg3Ljg4MDMgMjE2Ljk3MyA4OC4xODAzIDIxNi4yNzMgODguNDgwM0MyMTMuMjczIDg5Ljg4MDMgMjEwLjM3MyA5MS43ODAzIDIwNy42NzMgOTMuNzgwM0MyMDQuNTczIDk2LjA4MDMgMjAxLjY3MyA5OC41ODAzIDE5OC45NzMgMTAxLjE4QzE5MC40NzMgMTAxLjQ4IDE4MS45NzMgMTAxLjc4IDE3My40NzMgMTAyLjA4QzE0MC4xNzMgMTAzLjM4IDEwNi45NzMgMTA1LjI4IDczLjc3MjUgMTA2Ljk4QzcyLjY3MjUgMTA3LjA4IDcyLjc3MjUgMTA4LjU4IDczLjg3MjUgMTA4LjU4QzkyLjk3MjUgMTA5LjY4IDExMS44NzMgMTExLjQ4IDEzMC43NzMgMTE0LjE4QzE0NC41NzMgMTE2LjE4IDE2Mi42NzMgMTE2LjM4IDE3Mi45NzMgMTI3LjI4QzE3My4xNzMgMTI3LjQ4IDE3My41NzMgMTI3LjQ4IDE3My43NzMgMTI3LjM4QzE4Mi41NzMgMTIwLjQ4IDE5MC4wNzMgMTExLjI4IDE5OC4yNzMgMTAzLjE4QzIyMi43NzMgMTAyLjY4IDI0Ny4xNzMgMTAyLjc4IDI3MS42NzMgMTAyLjU4QzI3MS44NzMgMTAyLjU4IDI3MS44NzMgMTAxLjk4IDI3MS40NzMgMTAxLjk4Wk0xOTIuNTczIDEwNy4zOEMxODcuNjczIDExMi4zOCAxODIuODczIDExNy40OCAxNzcuNjczIDEyMi4yOEMxNzYuMzczIDEyMy40OCAxNzUuMDczIDEyNC41OCAxNzMuNjczIDEyNS42OEMxNzIuOTczIDEyNi4xOCAxNzAuNjczIDEyMy42OCAxNzAuMTczIDEyMy4yOEMxNjcuNjczIDEyMS4zOCAxNjQuODczIDEyMC4wOCAxNjEuOTczIDExOC45OEMxNTAuMTczIDExNC4zOCAxMzcuMDczIDExMy44OCAxMjQuNjczIDExMS42OEMxMTIuNzczIDEwOS41OCAxMDAuNzczIDEwOC41OCA4OC43NzI1IDEwNy43OEMxMTYuNTczIDEwNi4zOCAxNDQuMjczIDEwNC44OCAxNzIuMDczIDEwMy43OEMxODAuMzczIDEwMy40OCAxODguNTczIDEwMy4yOCAxOTYuODczIDEwMy4wOEMxOTUuMzczIDEwNC41OCAxOTMuOTczIDEwNS45OCAxOTIuNTczIDEwNy4zOFoiIGZpbGw9IiMwQjIwMzQiLz4KPC9zdmc+Cg==",
            "signatureText": "",
            "signatureStyle": ""
        }
    },
    "event": {
        "eventType": {
            "eventType": "Other",
            "eventTypeOther": "Hello test"
        },
        "eventName": "Global Innovation Summit 2026",
        "startDate": "2026-03-10",
        "endDate": "2026-03-12",
        "venue": "Las Vegas Convention Center",
        "attendees": "1,000+",
        "eventFormat": "Hybrid"
    },
    "roomByRoom": {
        "podiumMic": {
            "podiumMic": "Yes"
        },
        "wirelessMics": {
            "wirelessMics": "Yes",
            "wirelessMicsQty": "141",
            "wirelessMicsType": "Headset Mics"
        },
        "largeMonitorsOrScreenProjector": {
            "largeMonitorsOrScreenProjector": "Yes",
            "largeMonitorsQty": "41"
        },
        "clientProvideOwnPresentationLaptop": {
            "clientProvideOwnPresentationLaptop": "Yes",
            "clientLaptopQty": "41"
        },
        "presentationLaptops": {
            "presentationLaptops": "Yes",
            "presentationLaptopQty": "10"
        },
        "videoPlayback": {
            "videoPlayback": "Yes",
            "videoPlaybackCount": "41"
        },
        "audienceQa": {
            "audienceQa": "Yes",
            "audienceQaMethod": "Passing a Microphone"
        },
        "cameras": {
            "cameras": "Yes",
            "camerasQty": "41"
        },
        "videoRecording": {
            "videoRecording": "Yes",
            "videoRecordingType": "Camera Feed Only"
        },
        "stageWashLighting": {
            "stageWashLighting": "Yes",
            "stageWashLightingStageSize": "120ft x 40ft stage, full front wash"
        },
        "roomFunction": "Keynote Pavilion",
        "estimatedAttendeesInRoom": "1000",
        "loadInDateTime": "2026-03-09T08:00",
        "rehearsalDateTime": "2026-03-09T16:00",
        "showStartDateTime": "2026-03-10T09:00",
        "showEndDateTime": "2026-03-12T18:00",
        "audioSystemForHowManyPpl": "1000",
        "audioRecording": "Yes",
        "ledWall": "Yes",
        "videoFormatAspectRatio": "Unique Aspect Ratio",
        "backlightingFor": "Yes",
        "drapeOrScenicUplighting": "Yes",
        "audienceLighting": "Yes",
        "programConfidenceMonitor": {
            "programConfidenceMonitor": "Yes",
            "programConfidenceMonitorQty": "2"
        },
        "notesConfidenceMonitor": {
            "notesConfidenceMonitor": "Yes",
            "notesConfidenceMonitorQty": "2"
        },
        "speakerTimer": "Yes",
        "scenicStageDesign": "Yes",
        "contentVideoNeeds": "Full 120ft curved LED wall, native 4K switching via Barco E2, 3 discrete camera feeds, PiP for remote speakers, live translation support."
    },
    "production": {
        "scenicStageDesign": "Yes",
        "unionLabor": "Not Sure",
        "showCrewNeeded": [
            "A1 (AUDIO)",
            "A2 (AUDIO ASSIST)",
            "V1 (VIDEO)",
            "V2 (VIDEO ASSIST)",
            "TD (TECHNICAL DIRECTOR)",
            "L1 (LIGHTING)",
            "GRAPHICS OP",
            "CAMERA OPERATOR",
            "SHOWCALLER"
        ],
        "otherRolesNeeded": "We will need bilingual teleprompter operators (English/Spanish) and 4 dedicated breakout room managers."
    },
    "venue": {
        "needRiggingForFlown": {
            "needRiggingForFlown": "YES",
            "riggingPlotOrSpecs": "High steel rigging required. Max weight per point is 1500 lbs. Motors provided by venue."
        },
        "needDedicatedPowerDrops": {
            "needDedicatedPowerDrops": "YES",
            "standardAmpWall": "400A"
        },
        "powerDropsHowMany": "12"
    },
    "uploads": {
        "reviewExistingAvQuote": {
            "reviewExistingAvQuote": "YES",
            "avQuoteFiles": [
                "https://bayshore.nyc3.digitaloceanspaces.com/DXG-RFP-Tool/proposals/69afe2955de8b350aa06e0f9/1775621077310-Invoice-399DB1E8-0001.pdf"
            ]
        },
        "supportDocuments": []
    },
    "budget": {
        "estimatedAvBudget": "$50-100K",
        "budgetCustomAmount": "",
        "proposalFormatPreferences": [
            "GEAR ITEMIZATION",
            "LABOR BREAKDOWN",
            "ALL-IN ESTIMATE"
        ],
        "timelineForProposal": "2 Weeks",
        "callWithDxgProducer": "YES",
        "howDidYouHear": "LinkedIn",
        "howDidYouHearOther": ""
    },
    "contact": {
        "contactFirstName": "Sarah",
        "contactLastName": "Jennings",
        "contactTitle": "VP of Global Conferences",
        "contactOrganization": "Apex Dynamics",
        "contactEmail": "s.jennings@apexdynamics.com",
        "contactPhone": "+1 (415) 555-8821",
        "anythingElse": "Please ensure the proposal includes line-item pricing for the curved LED wall separately from the main gear package. We are comparing 3 vendors."
    },
    "_id": "69d5ceb8d906e068476942e9",
    "userId": "69afe2955de8b350aa06e0f9",
    "status": "submitted",
    "isActive": true,
    "isFavorite": false,
    "isAccepted": false,
    "isOpen": true,
    "viewsCount": 12,
    "templateId": "template-one",
    "createdAt": "2026-04-08T03:42:48.923Z",
    "updatedAt": "2026-04-08T04:16:22.178Z",
    "__v": 0,
    "proposalSlug": "global-innovation-summit-2026-69d5ceb8d906e068476942e9",
    "proposalLink": "http://localhost:3000/proposal/global-innovation-summit-2026-69d5ceb8d906e068476942e9",
    "publicProposalLink": "https://abuco.goprospero.com/proposal/global-innovation-summit-2026-69d5ceb8d906e068476942e9",
    "badge": "Proposal • submitted • 2026-04-08",
    "brandName": "Bayshore",
    "titleLineOne": "Global Innovation",
    "titleLineTwo": "Summit 2026",
    "heroText": "Hello test",
    "metaChips": [
        "Status: submitted",
        "Attendees: 1,000+",
        "Format: Hybrid",
        "Start: 2026-03-10",
        "Views: 12"
    ],
    "ctaSecondary": "Download PDF",
    "aboutTitle": "Project Snapshot",
    "aboutText": "2026-03-10 - 2026-03-12. Las Vegas Convention Center. This proposal is tailored to your submitted scope and preferences.",
    "summaryBullets": [
        "Venue: Las Vegas Convention Center",
        "Room Function: Keynote Pavilion",
        "Start Date: 2026-03-10",
        "End Date: 2026-03-12",
        "Additional roles: We will need bilingual teleprompter operators (English/Spanish) and 4 dedicated breakout room managers."
    ],
    "servicesTitle": "Scope & Requirements",
    "services": [
        {
            "title": "Event Profile",
            "text": "Hybrid format • 1,000+ attendees"
        },
        {
            "title": "Venue & Setup",
            "text": "Las Vegas Convention Center • Banquet Rounds"
        },
        {
            "title": "AV & Production",
            "text": "Custom • Crew: A1 (AUDIO), A2 (AUDIO ASSIST), V1 (VIDEO), V2 (VIDEO ASSIST), TD (TECHNICAL DIRECTOR), L1 (LIGHTING), GRAPHICS OP, CAMERA OPERATOR, SHOWCALLER"
        },
        {
            "title": "Power & Rigging",
            "text": "Rigging: YES • Dedicated Power: YES"
        }
    ],
    "pricingTitle": "Budget & Delivery",
    "pricing": [
        {
            "name": "Budget",
            "price": "$50-100K",
            "bullets": [
                "Start Date: 2026-03-10",
                "End Date: 2026-03-12",
                "Format: GEAR ITEMIZATION, LABOR BREAKDOWN, ALL-IN ESTIMATE",
                "Producer Call: YES"
            ]
        },
        {
            "name": "Room Planning",
            "price": "1",
            "bullets": [
                "Room Function: Keynote Pavilion",
                "Room Setup: Banquet Rounds",
                "Scenic Design: Yes"
            ]
        },
        {
            "name": "Technical",
            "price": "Custom",
            "bullets": [
                "Union Labor: Not Sure",
                "Power Drops: 12"
            ]
        }
    ],
    "closingTitle": "Ready To Move Forward With",
    "brandAddress": "Las Vegas Convention Center",
    "brandEmail": "ui.abukawsar@gmail.com",
    "contactName": "Sarah Jennings",
    "contactPhone": "+12163547758ujkl",
    "closingSubtitle": "VP of Global Conferences - Apex Dynamics",
    "additionalNotes": "Please ensure the proposal includes line-item pricing for the curved LED wall separately from the main gear package. We are comparing 3 vendors.",
    "budgetDisplay": "$50-100K",
    "proposalFormats": [
        "GEAR ITEMIZATION",
        "LABOR BREAKDOWN",
        "ALL-IN ESTIMATE"
    ],
    "crewRoles": [
        "A1 (AUDIO)",
        "A2 (AUDIO ASSIST)",
        "V1 (VIDEO)",
        "V2 (VIDEO ASSIST)",
        "TD (TECHNICAL DIRECTOR)",
        "L1 (LIGHTING)",
        "GRAPHICS OP",
        "CAMERA OPERATOR",
        "SHOWCALLER"
    ],
    "scenicStageDesignLabel": "Required (Yes)",
    "unionLaborLabel": "Not Sure",
    "powerDropsLabel": "12 Dedicated",
    "ampWallLabel": "400A Main Amp Wall",
    "avGroups": [
        {
            "title": "Room & Logistics",
            "items": [
                {
                    "label": "Function",
                    "value": "Keynote Pavilion"
                },
                {
                    "label": "Attendees",
                    "value": "1000"
                },
                {
                    "label": "Room Setup",
                    "value": "Banquet Rounds"
                },
                {
                    "label": "Show Timing",
                    "value": "2026-03-10 - 2026-03-12"
                }
            ]
        },
        {
            "title": "Audio & Video",
            "items": [
                {
                    "label": "Podium Mic",
                    "value": "Yes"
                },
                {
                    "label": "Wireless Mics",
                    "value": "Yes (141)"
                },
                {
                    "label": "Audio Recording",
                    "value": "Yes"
                },
                {
                    "label": "Cameras",
                    "value": "Yes (41)"
                },
                {
                    "label": "LED Wall",
                    "value": "Yes"
                }
            ]
        },
        {
            "title": "Display & Monitoring",
            "items": [
                {
                    "label": "Large Monitors",
                    "value": "Yes (41)"
                },
                {
                    "label": "Presentation Laptops",
                    "value": "Yes (10)"
                },
                {
                    "label": "Video Playback",
                    "value": "Yes (41)"
                },
                {
                    "label": "Video Format",
                    "value": "Unique Aspect Ratio"
                }
            ]
        },
        {
            "title": "Engagement & Lighting",
            "items": [
                {
                    "label": "Audience Q&A",
                    "value": "Yes (Passing a Microphone)"
                },
                {
                    "label": "Video Recording",
                    "value": "Yes (Camera Feed Only)"
                },
                {
                    "label": "Stage Wash Lighting",
                    "value": "Yes (120ft x 40ft stage, full front wash)"
                },
                {
                    "label": "Backlighting / Scenic / Audience",
                    "value": "Yes / Yes / Yes"
                }
            ]
        },
        {
            "title": "Confidence & Monitoring",
            "items": [
                {
                    "label": "Program Confidence",
                    "value": "Yes (2)"
                },
                {
                    "label": "Notes Confidence",
                    "value": "Yes (2)"
                }
            ]
        }
    ],
    "ledDescription": "Full 120ft curved LED wall, native 4K switching via Barco E2, 3 discrete camera feeds, PiP for remote speakers, live translation support.",
    "ledHeadline": "LED Wall Requested",
    "signatureColor": "#5C93A3",
    "signatureTitle": "Authorized Signature",
    "signatureName": "Sarah Jennings",
    "signatureRole": "VP of Global Conferences - Apex Dynamics",
    "signatureDate": "2026-04-08",
    "signatureImageUrl": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzEzIiBoZWlnaHQ9IjE3NCIgdmlld0JveD0iMCAwIDMxMyAxNzQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMTIuMjEyIiBoZWlnaHQ9IjE3NCIgcng9IjEyIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMjcxLjQ3MyAxMDEuOThDMjQ3Ljc3MyAxMDAuMjggMjIzLjk3MyAxMDAuNDggMjAwLjE3MyAxMDEuMjhDMjA2LjM3MyA5NS4zODAzIDIxMi45NzMgOTAuMjgwMyAyMjAuOTczIDg3LjI4MDNDMjIxLjM3MyA4Ny4xODAzIDIyMS44NzMgODcuMTgwMyAyMjIuMjczIDg3LjA4MDNDMjIyLjI3MyA4Ny4wODAzIDIyMi4yNzMgODcuMTgwMyAyMjIuMTczIDg3LjE4MDNDMjIyLjA3MyA4Ny4zODAzIDIyMi4zNzMgODcuNDgwMyAyMjIuNDczIDg3LjI4MDNDMjIyLjU3MyA4Ny4xODAzIDIyMi41NzMgODcuMDgwMyAyMjIuNjczIDg2Ljk4MDNDMjIyLjk3MyA4Ni45ODAzIDIyMy4yNzMgODYuODgwMyAyMjMuNTczIDg2Ljg4MDNDMjI0LjM3MyA4Ni43ODAzIDIyNC4zNzMgODUuNjgwMyAyMjMuNTczIDg1LjY4MDNDMjE4LjM3MyA4NS4zODAzIDIxMy4yNzMgODYuODgwMyAyMDguMTczIDg3LjM4MDNDMjA4LjM3MyA4Ny4wODAzIDIwOC41NzMgODYuODgwMyAyMDguNzczIDg2LjU4MDNDMjA5LjM3MyA4NS44ODAzIDIwOC43NzMgODQuNTgwMyAyMDcuNzczIDg0Ljk4MDNDMjA0LjU3MyA4Ni4xODAzIDIwMC42NzMgODcuODgwMyAxOTcuMDczIDg3LjQ4MDNDMTk3LjQ3MyA4Ny4xODAzIDE5Ny44NzMgODYuODgwMyAxOTguMzczIDg2LjY4MDNDMTk5LjM3MyA4Ni4xODAzIDE5OC42NzMgODQuODgwMyAxOTcuNzczIDg0Ljg4MDNDMTkyLjI3MyA4NC42ODAzIDE4Ny4wNzMgODYuNDgwMyAxODEuNjczIDg3LjI4MDNDMTgxLjY3MyA4Ny4yODAzIDE4MS42NzMgODcuMjgwMyAxODEuNzczIDg3LjE4MDNDMTgyLjM3MyA4Ni41ODAzIDE4MS44NzMgODUuNDgwMyAxODEuMDczIDg1LjU4MDNDMTc2LjQ3MyA4NS44ODAzIDE3Mi4xNzMgODguNjgwMyAxNjcuNTczIDg4LjY4MDNDMTY3Ljc3MyA4OC40ODAzIDE2OC4wNzMgODguMjgwMyAxNjguMjczIDg4LjA4MDNDMTY4Ljc3MyA4Ny41ODAzIDE2OC40NzMgODYuNTgwMyAxNjcuNzczIDg2LjQ4MDNDMTYwLjU3MyA4NS4zODAzIDE1My44NzMgOTAuMzgwMyAxNDYuODczIDg5Ljc4MDNDMTQ3LjM3MyA4OS4zODAzIDE0Ny43NzMgODguOTgwMyAxNDguMjczIDg4LjQ4MDNDMTQ4Ljg3MyA4Ny44ODAzIDE0OC4zNzMgODYuODgwMyAxNDcuNTczIDg2Ljg4MDNDMTQxLjI3MyA4Ny4xODAzIDEzNS40NzMgOTAuMDgwMyAxMjkuMzczIDkwLjg4MDNDMTMwLjU3MyA5MC4xODAzIDEzMS43NzMgODkuMzgwMyAxMzIuNzczIDg4LjE4MDNDMTMzLjI3MyA4Ny41ODAzIDEzMi45NzMgODYuNTgwMyAxMzIuMDczIDg2LjY4MDNDMTI0LjE3MyA4Ni45ODAzIDExNy4xNzMgOTEuODgwMyAxMDkuNDczIDkyLjY4MDNDMTEzLjI3MyA5MC42ODAzIDExNy4xNzMgODguODgwMyAxMjAuODczIDg2LjU4MDNDMTIxLjU3MyA4Ni4wODAzIDEyMS4yNzMgODQuODgwMyAxMjAuMzczIDg0Ljg4MDNDMTA4LjA3MyA4NS43ODAzIDk2LjU3MjUgOTAuODgwMyA4NS40NzI1IDk2LjE4MDNDOTYuNTcyNSA4Ny43ODAzIDEwOS4xNzMgODEuNjgwMyAxMjIuMjczIDc2Ljg4MDNDMTIzLjA3MyA3Ni41ODAzIDEyMi44NzMgNzUuMjgwMyAxMjIuMDczIDc1LjM4MDNDMTE0LjA3MyA3Ni4yODAzIDEwNi4wNzMgNzcuNDgwMyA5OC4xNzI1IDc5LjE4MDNDMTA4LjA3MyA3MS4yODAzIDExOC4wNzMgNjMuMDgwMyAxMjcuNzczIDU0LjU4MDNDMTQwLjA3MyA1Mi44ODAzIDE1Mi41NzMgNTIuMjgwMyAxNjQuOTczIDUxLjk4MDNDMTkxLjM3MyA1MS4zODAzIDIxNy44NzMgNTIuNDgwMyAyNDQuMjczIDUwLjY4MDNDMjQ0LjU3MyA1MC42ODAzIDI0NC41NzMgNTAuMjgwMyAyNDQuMjczIDUwLjI4MDNDMjE3LjM3MyA1MS40ODAzIDE5MC40NzMgNDkuODgwMyAxNjMuNTczIDUwLjM4MDNDMTUyLjM3MyA1MC41ODAzIDE0MS4xNzMgNTEuMTgwMyAxMjkuOTczIDUyLjU4MDNDMTMyLjA3MyA1MC42ODAzIDEzNC4yNzMgNDguNzgwMyAxMzYuMzczIDQ2Ljg4MDNDMTM2LjU3MyA0Ni42ODAzIDEzNi4yNzMgNDYuNDgwMyAxMzYuMDczIDQ2LjU4MDNDMTMzLjc3MyA0OC41ODAzIDEzMS40NzMgNTAuNjgwMyAxMjkuMDczIDUyLjY4MDNDMTI3LjQ3MyA1Mi44ODAzIDEyNS44NzMgNTMuMDgwMyAxMjQuMjczIDUzLjI4MDNDMTExLjE3MyA1NS4yODAzIDk3LjU3MjUgNTYuNDgwMyA4NC43NzI1IDYwLjU4MDNDODQuMDcyNSA2MC43ODAzIDg0LjM3MjUgNjEuNzgwMyA4NS4wNzI1IDYxLjY4MDNDOTguMzcyNSA1OC4wODAzIDExMi4xNzMgNTYuNzgwMyAxMjUuNzczIDU0Ljg4MDNDMTI2LjE3MyA1NC43ODAzIDEyNi40NzMgNTQuNzgwMyAxMjYuODczIDU0Ljc4MDNDMTE2Ljc3MyA2My4zODAzIDEwNi4zNzMgNzEuNzgwMyA5NS43NzI1IDc5Ljc4MDNDOTQuMDcyNSA4MC4xODAzIDkyLjM3MjUgODAuNTgwMyA5MC42NzI1IDgxLjA4MDNDODUuNTcyNSA4Mi40ODAzIDgwLjQ3MjUgODQuMDgwMyA3NS40NzI1IDg1Ljg4MDNDNzIuOTcyNSA4Ni41ODAzIDcwLjY3MjUgODcuNTgwMyA2OC4yNzI1IDg4LjU4MDNDNjcuNDcyNSA4OC45ODAzIDY2LjY3MjUgODkuMjgwMyA2NS44NzI1IDg5LjY4MDNDNjQuOTcyNSA5MC4wODAzIDY0Ljc3MjUgOTAuMzgwMyA2NC44NzI1IDkwLjQ4MDNDNjQuNDcyNSA5MC41ODAzIDY0LjE3MjUgOTAuNjgwMyA2My43NzI1IDkwLjg4MDNDNjMuNDcyNSA5MC45ODAzIDYzLjU3MjUgOTEuNDgwMyA2My45NzI1IDkxLjM4MDNDNzMuNTcyNSA4Ny42ODAzIDgzLjE3MjUgODQuMzgwMyA5Mi45NzI1IDgxLjc4MDNDOTEuMzcyNSA4Mi45ODAzIDg5Ljg3MjUgODQuMDgwMyA4OC4yNzI1IDg1LjE4MDNDODAuMDcyNSA5MS4wODAzIDcxLjc3MjUgOTYuNzgwMyA2My4xNzI1IDEwMi4yOEM1NS4yNzI1IDEwNy4yOCA0Ny4zNzI1IDExMi4yOCA0MC42NzI1IDExOC44OEMzOS44NzI1IDExOS42OCA0MS4wNzI1IDEyMC42OCA0MS44NzI1IDEyMC4wOEM0Mi44NzI1IDExOS4yOCA0My45NzI1IDExOC42OCA0NC44NzI1IDExNy43OEM0NS4wNzI1IDExNy41OCA0NC45NzI1IDExNy4zOCA0NC44NzI1IDExNy4xOEM1MS4wNzI1IDExMS42OCA1OC4wNzI1IDEwNy4wOCA2NC45NzI1IDEwMi41OEM3My40NzI1IDk2Ljk4MDMgODEuNzcyNSA5MS4xODAzIDg5Ljg3MjUgODUuMTgwM0M5MS42NzI1IDgzLjg4MDMgOTMuMzcyNSA4Mi41ODAzIDk1LjE3MjUgODEuMTgwM0MxMDEuODczIDc5LjQ4MDMgMTA4LjY3MyA3OC4xODAzIDExNS41NzMgNzcuMzgwM0MxMDIuMDczIDgyLjQ4MDMgODkuMDcyNSA4OS44ODAzIDc4LjI3MjUgOTkuMzgwM0M3Ny40NzI1IDEwMC4wOCA3OC41NzI1IDEwMS4wOCA3OS4zNzI1IDEwMC43OEM5MC45NzI1IDk1LjI4MDMgMTAyLjk3MyA4OS4wODAzIDExNS44NzMgODcuMDgwM0MxMTIuMjczIDg4Ljk4MDMgMTA4LjY3MyA5MC41ODAzIDEwNS4xNzMgOTIuNjgwM0MxMDQuMzczIDkzLjE4MDMgMTA0Ljg3MyA5NC4yODAzIDEwNS42NzMgOTQuMzgwM0MxMTQuMDczIDk1LjA4MDMgMTIxLjE3MyA4OS44ODAzIDEyOS4xNzMgODguNTgwM0MxMjcuODczIDg5LjQ4MDMgMTI2LjM3MyA5MC4xODAzIDEyNS4xNzMgOTEuMDgwM0MxMjQuNDczIDkxLjY4MDMgMTI0Ljc3MyA5Mi43ODAzIDEyNS42NzMgOTIuNzgwM0MxMzIuMjczIDkyLjk4MDMgMTM4LjI3MyA4OS45ODAzIDE0NC42NzMgODguODgwM0MxNDQuMzczIDg5LjA4MDMgMTQ0LjE3MyA4OS4yODAzIDE0My45NzMgODkuNTgwM0MxNDMuNDczIDkwLjA4MDMgMTQzLjc3MyA5MC45ODAzIDE0NC40NzMgOTEuMDgwM0MxNTEuNTczIDkyLjc4MDMgMTU4LjE3MyA4Ny44ODAzIDE2NS4xNzMgODcuODgwM0MxNjQuOTczIDg4LjA4MDMgMTY0Ljc3MyA4OC4yODAzIDE2NC40NzMgODguNDgwM0MxNjMuOTczIDg4Ljk4MDMgMTY0LjI3MyA4OS45ODAzIDE2NC45NzMgOTAuMDgwM0MxNjkuNTczIDkwLjk4MDMgMTczLjU3MyA4OC44ODAzIDE3Ny44NzMgODcuNzgwM0MxNzcuNDczIDg4LjM4MDMgMTc3Ljk3MyA4OS4yODAzIDE3OC43NzMgODkuMjgwM0MxODMuODczIDg4Ljk4MDMgMTg4Ljc3MyA4Ny4zODAzIDE5My43NzMgODYuNzgwM0MxOTMuMjczIDg3LjE4MDMgMTkzLjE3MyA4OC4xODAzIDE5My44NzMgODguNDgwM0MxOTcuNjczIDg5Ljk4MDMgMjAxLjY3MyA4OC45ODAzIDIwNS4zNzMgODcuNjgwM0MyMDQuOTczIDg4LjI4MDMgMjA1LjI3MyA4OS4zODAzIDIwNi4xNzMgODkuMjgwM0MyMTAuMjczIDg5LjA4MDMgMjE0LjI3MyA4OC4yODAzIDIxOC4zNzMgODcuNTgwM0MyMTcuNjczIDg3Ljg4MDMgMjE2Ljk3MyA4OC4xODAzIDIxNi4yNzMgODguNDgwM0MyMTMuMjczIDg5Ljg4MDMgMjEwLjM3MyA5MS43ODAzIDIwNy42NzMgOTMuNzgwM0MyMDQuNTczIDk2LjA4MDMgMjAxLjY3MyA5OC41ODAzIDE5OC45NzMgMTAxLjE4QzE5MC40NzMgMTAxLjQ4IDE4MS45NzMgMTAxLjc4IDE3My40NzMgMTAyLjA4QzE0MC4xNzMgMTAzLjM4IDEwNi45NzMgMTA1LjI4IDczLjc3MjUgMTA2Ljk4QzcyLjY3MjUgMTA3LjA4IDcyLjc3MjUgMTA4LjU4IDczLjg3MjUgMTA4LjU4QzkyLjk3MjUgMTA5LjY4IDExMS44NzMgMTExLjQ4IDEzMC43NzMgMTE0LjE4QzE0NC41NzMgMTE2LjE4IDE2Mi42NzMgMTE2LjM4IDE3Mi45NzMgMTI3LjI4QzE3My4xNzMgMTI3LjQ4IDE3My41NzMgMTI3LjQ4IDE3My43NzMgMTI3LjM4QzE4Mi41NzMgMTIwLjQ4IDE5MC4wNzMgMTExLjI4IDE5OC4yNzMgMTAzLjE4QzIyMi43NzMgMTAyLjY4IDI0Ny4xNzMgMTAyLjc4IDI3MS42NzMgMTAyLjU4QzI3MS44NzMgMTAyLjU4IDI3MS44NzMgMTAxLjk4IDI3MS40NzMgMTAxLjk4Wk0xOTIuNTczIDEwNy4zOEMxODcuNjczIDExMi4zOCAxODIuODczIDExNy40OCAxNzcuNjczIDEyMi4yOEMxNzYuMzczIDEyMy40OCAxNzUuMDczIDEyNC41OCAxNzMuNjczIDEyNS42OEMxNzIuOTczIDEyNi4xOCAxNzAuNjczIDEyMy42OCAxNzAuMTczIDEyMy4yOEMxNjcuNjczIDEyMS4zOCAxNjQuODczIDEyMC4wOCAxNjEuOTczIDExOC45OEMxNTAuMTczIDExNC4zOCAxMzcuMDczIDExMy44OCAxMjQuNjczIDExMS42OEMxMTIuNzczIDEwOS41OCAxMDAuNzczIDEwOC41OCA4OC43NzI1IDEwNy43OEMxMTYuNTczIDEwNi4zOCAxNDQuMjczIDEwNC44OCAxNzIuMDczIDEwMy43OEMxODAuMzczIDEwMy40OCAxODguNTczIDEwMy4yOCAxOTYuODczIDEwMy4wOEMxOTUuMzczIDEwNC41OCAxOTMuOTczIDEwNS45OCAxOTIuNTczIDEwNy4zOFoiIGZpbGw9IiMwQjIwMzQiLz4KPC9zdmc+Cg==",
    "ledTags": [
        "Unique Aspect Ratio"
    ]
}

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

export default ProposalData;
