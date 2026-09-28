(*
POU type: PROGRAM
POU name: PLC_PRG

Paste the VAR block into the POU Declaration pane.
Paste the statements after IMPLEMENTATION into the Implementation pane.
*)

(* DECLARATION *)
VAR
    (* Test-only values. Do not map these to physical I/O. *)
    SimMode : BOOL := TRUE;
    SimInput : BOOL := FALSE;
    PhysicalSnapshot : BOOL := FALSE;

    EffectiveInput : BOOL := FALSE;
    InputSource : USINT := 1; (* 1 = SIM, 2 = SNAPSHOT *)

    (* Use this one variable for Write/Force experiments. *)
    WriteForceProbe : BOOL := FALSE;

    (* Reset this with Write Values before each probe experiment. *)
    ClearProbeEvidence : BOOL := FALSE;
    ProbeAtProgramEntry : BOOL := FALSE;
    ProbeEntrySeen : BOOL := FALSE;
    ProbeAfterProgramWrite : BOOL := FALSE;
END_VAR

(* IMPLEMENTATION *)
(* Source selector: ordinary application logic, not CODESYS Simulation Mode. *)
IF SimMode THEN
    EffectiveInput := SimInput;
    InputSource := 1;
ELSE
    EffectiveInput := PhysicalSnapshot;
    InputSource := 2;
END_IF;

(* A Write of TRUE clears the persistent probe evidence for the next case. *)
IF ClearProbeEvidence THEN
    ProbeEntrySeen := FALSE;
    ClearProbeEvidence := FALSE;
END_IF;

(* This assignment deliberately exposes Write Values versus Force Values. *)
ProbeAtProgramEntry := WriteForceProbe;
IF ProbeAtProgramEntry THEN
    ProbeEntrySeen := TRUE;
END_IF;
WriteForceProbe := FALSE;
ProbeAfterProgramWrite := WriteForceProbe;
