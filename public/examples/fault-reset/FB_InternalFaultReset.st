(* CODESYS V3 ST source reference. Not compiled or hardware-validated.
   Create a Function Block named FB_InternalFaultReset with ST implementation.
   Paste the declaration and implementation into their separate editor panes.
   No I/O mapping; do not declare this instance RETAIN or PERSISTENT in this exercise. *)

(* DECLARATION *)
FUNCTION_BLOCK FB_InternalFaultReset
VAR_INPUT
    SourceValid : BOOL;
    ResetRequest : BOOL;
    CauseActive : BOOL;
END_VAR
VAR_OUTPUT
    Fault : BOOL := TRUE;
    Armed : BOOL := FALSE;
    AcceptedPulse : BOOL := FALSE;
END_VAR

(* IMPLEMENTATION *)
AcceptedPulse := FALSE;
IF CauseActive THEN
    Fault := TRUE;
END_IF;
IF NOT SourceValid THEN
    Armed := FALSE;
ELSIF NOT ResetRequest THEN
    Armed := TRUE;
ELSE
    IF Armed AND NOT CauseActive AND Fault THEN
        Fault := FALSE;
        AcceptedPulse := TRUE;
    END_IF;
    Armed := FALSE;
END_IF;
