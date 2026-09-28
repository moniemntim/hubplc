(* CODESYS V3 ST reference only. Not compiled or simulator-validated.
   Declaration and implementation belong in separate PLC_PRG editor panes.
   The project's cyclic task must call PLC_PRG exactly once per task cycle. *)
(* DECLARATION *)
PROGRAM PLC_PRG
VAR
    ResetLogic : FB_InternalFaultReset;
    SourceValid : BOOL := TRUE;
    ResetRequest : BOOL := TRUE;
    CauseActive : BOOL := FALSE;
END_VAR
(* IMPLEMENTATION *)
ResetLogic(
    SourceValid := SourceValid,
    ResetRequest := ResetRequest,
    CauseActive := CauseActive
);
