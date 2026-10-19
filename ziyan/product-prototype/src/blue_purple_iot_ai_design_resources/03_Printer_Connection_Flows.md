# Printer Connection Flows

## Printer First Setup Flow

Trigger:

User opens printer connection feature.

Steps:

1.  Device Discovery

Page: DeviceSearchPage

2.  Device Selection

Page: DeviceListPage

3.  WiFi Configuration

Page: WifiSetupPage

4.  Connection Verification

Page: ConnectingPage

5.  Success

Page: SuccessPage

## State Machine

States:

-   idle
-   searching
-   device_found
-   wifi_input
-   connecting
-   connected
-   failed

Transitions:

searching: - device_found - timeout

connecting: - connected - failed
