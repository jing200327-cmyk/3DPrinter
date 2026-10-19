# AI Component Library

## Purpose

Components are reusable design assets that AI should call before
creating new UI.

## GradientButton

Purpose:

Primary onboarding action.

Variants:

-   primary

States:

-   default
-   pressed
-   loading
-   disabled

Usage:

Allowed: - Connect Printer - Continue - Start Setup - Finish

Forbidden: - Destructive actions

## DeviceCard

Purpose:

Display printer information.

Properties:

-   deviceName
-   model
-   status
-   signalStrength
-   connectionType

States:

-   searching
-   discovered
-   connecting
-   connected
-   failed

## WifiNetworkCard

Purpose:

Display WiFi network information.

Properties:

-   ssid
-   signal
-   security

States:

-   available
-   selected
-   unavailable

## ConnectionStepper

Purpose:

Show onboarding progress.

Steps:

-   Scan Device
-   Connect WiFi
-   Verify
-   Ready

States:

-   pending
-   active
-   completed
-   error

## PrinterIllustration

Purpose:

Visual guidance component.

Usage:

-   Searching
-   Empty State
-   Success
-   Error
