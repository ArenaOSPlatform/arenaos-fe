import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Radio,
  Upload,
  Video,
} from "lucide-react";
import {
  getMatchEvidences,
  submitMatchEvidence,
} from "@/services/evidence.service";
import {
  checkInMatch,
  confirmMatchResult,
  disputeMatchResult,
  getMatchById,
  startMatch,
  submitMatchResult,
} from "@/services/match.service";
import { uploadFile } from "@/services/upload.service";
import { EmptyState, LoadingState, useConfirm, useToast } from "@/components/ui";

type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  pendingScoreA: number | null;
  pendingScoreB: number | null;
  resultStatus: string | null;
  resultSubmittedBy: string | null;
  resultSubmittedTeamId: string | null;
  resultSubmittedAt: string | null;
  resultEvidenceId: string | null;
  status: string;
  teamACheckedInAt: string | null;
  teamBCheckedInAt: string | null;
  teamACheckedInBy: string | null;
  teamBCheckedInBy: string | null;
  scheduledAt: string | null;
  livestreamUrl: string | null;
  roomCode: string | null;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  winnerTeam: MatchTeam | null;
  tournament: {
    name: string;
    game: string;
    format: string;
  };
};

type MatchTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type Evidence = {
  id: string;
  imageUrl: string;
  note: string | null;
  submittedBy: string;
  createdAt: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.length > 0) return message.join(", ");
  }

  return fallback;
}

export function MatchRoomPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [match, setMatch] = useState<Match | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [resultEvidenceFile, setResultEvidenceFile] = useState<File | null>(
    null,
  );
  const [disputeEvidenceFile, setDisputeEvidenceFile] = useState<File | null>(
    null,
  );
  const [archiveEvidenceFile, setArchiveEvidenceFile] = useState<File | null>(
    null,
  );
  const [archiveEvidenceNote, setArchiveEvidenceNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [pageError, setPageError] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function loadMatch(matchId: string) {
    const [matchRes, evidenceRes] = await Promise.all([
      getMatchById(matchId),
      getMatchEvidences(matchId),
    ]);

    setMatch(matchRes.data);
    setEvidences(evidenceRes.data);
    setScoreA(String(matchRes.data.pendingScoreA ?? matchRes.data.scoreA));
    setScoreB(String(matchRes.data.pendingScoreB ?? matchRes.data.scoreB));
  }

  useEffect(() => {
    if (!id) return;
    const matchId = id;
    let cancelled = false;

    async function fetchMatch() {
      try {
        setPageError("");
        await loadMatch(matchId);
      } catch (err) {
        if (!cancelled) {
          setPageError(getApiErrorMessage(err, "Match not found."));
        }
      }
    }

    void fetchMatch();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmitResult() {
    if (!id) return;

    if (scoreA === "" || scoreB === "") {
      toast.warning("Enter both team scores before submitting.");
      return;
    }

    if (!resultEvidenceFile) {
      toast.warning("Choose an evidence image before submitting result.");
      return;
    }

    const confirmed = await confirm({
      title: "Submit result for confirmation?",
      description: `Send ${scoreA || "0"} - ${scoreB || "0"} to the opposing captain for confirmation.`,
      confirmText: "Submit result",
      tone: "warning",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("score");
      const evidenceUrl = (await uploadFile(resultEvidenceFile)).data.url;

      const res = await submitMatchResult(id, {
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
        imageUrl: evidenceUrl,
        note: evidenceNote || undefined,
      });

      toast.success(res.message);
      setResultEvidenceFile(null);
      setEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Submit result failed. Only a match captain can submit results.",
        ),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUploadEvidence() {
    if (!id) return;

    if (!archiveEvidenceFile) {
      toast.warning("Choose an evidence image before uploading.");
      return;
    }

    try {
      setLoadingAction("upload-evidence");
      const evidenceUrl = (await uploadFile(archiveEvidenceFile)).data.url;

      const res = await submitMatchEvidence(id, {
        imageUrl: evidenceUrl,
        note: archiveEvidenceNote.trim() || undefined,
      });

      toast.success(res.message);
      setArchiveEvidenceFile(null);
      setArchiveEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload evidence failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleConfirmResult() {
    if (!id || !match) return;

    const confirmed = await confirm({
      title: "Confirm match result?",
      description: `Confirm ${match.pendingScoreA ?? 0} - ${match.pendingScoreB ?? 0}. This will complete the match.`,
      confirmText: "Confirm result",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("confirm-result");
      const res = await confirmMatchResult(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Confirm result failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCheckIn() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Check in for match?",
      description:
        "Only the captain of Team A or Team B can check in for this match.",
      confirmText: "Check in",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("check-in");
      const res = await checkInMatch(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Check-in failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleStartMatch() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Start match?",
      description:
        "Both captains have checked in. Starting the match will notify both teams.",
      confirmText: "Start match",
      tone: "success",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("start");
      const res = await startMatch(id);
      toast.success(res.message);
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Start match failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDisputeResult() {
    if (!id) return;

    if (!disputeReason.trim()) {
      toast.warning("Add a dispute reason before submitting.");
      return;
    }

    const confirmed = await confirm({
      title: "Dispute submitted result?",
      description: "Send this pending result to the organizer for review.",
      confirmText: "Dispute result",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      setLoadingAction("dispute");
      const disputeEvidenceUrl = disputeEvidenceFile
        ? (await uploadFile(disputeEvidenceFile)).data.url
        : undefined;

      const res = await disputeMatchResult(id, {
        reason: disputeReason,
        imageUrl: disputeEvidenceUrl,
        note: evidenceNote || undefined,
      });

      toast.success(res.message);
      setDisputeReason("");
      setDisputeEvidenceFile(null);
      setEvidenceNote("");
      await loadMatch(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Dispute result failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-6 py-16 text-white">
        {pageError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Match unavailable"
            description={pageError}
          />
        ) : (
          <LoadingState
            title="Loading match..."
            description="Fetching scoreboard, evidence and match room details."
          />
        )}
      </div>
    );
  }

  const isPendingConfirmation =
    match.status === "PENDING_CONFIRMATION" ||
    match.resultStatus === "PENDING_CONFIRMATION";
  const pendingEvidence = evidences.find(
    (item) => item.id === match.resultEvidenceId,
  );
  const resultSubmittedSlot =
    match.resultSubmittedTeamId === match.teamAId
      ? match.teamA?.name ?? "Team A"
      : match.resultSubmittedTeamId === match.teamBId
        ? match.teamB?.name ?? "Team B"
        : "Unknown team";
  const teamAName = match.teamA?.name ?? match.teamAId ?? "TBD";
  const teamBName = match.teamB?.name ?? match.teamBId ?? "TBD";
  const winnerName = match.winnerTeam?.name ?? match.winnerId ?? "TBD";

  return (
    <div className="min-h-screen bg-[#0B1020] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-bold tracking-[0.3em] text-cyan-400">
            MATCH ROOM
          </p>
          <h1 className="mt-4 text-5xl font-black">
            {teamAName} vs {teamBName}
          </h1>
          <p className="mt-4 text-white/60">
            {match.tournament.name} - Round {match.roundNumber}, Match{" "}
            {match.matchNumber}
          </p>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <div className="mb-8 flex items-center justify-between">
              <span className="rounded-full bg-red-500 px-4 py-1 text-xs font-black">
                {match.status}
              </span>

              <div className="flex items-center gap-2 text-cyan-300">
                <Radio size={18} />
                <span className="font-bold">Realtime Match</span>
              </div>
            </div>

            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-3xl border border-cyan-400/40 bg-cyan-400/10 p-8 text-center">
                <h2 className="text-3xl font-black">{teamAName}</h2>
                <p className="mt-3 text-white/50">Team A</p>
                <p
                  className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    match.teamACheckedInAt
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/10 text-white/45"
                  }`}
                >
                  {match.teamACheckedInAt ? "CHECKED IN" : "WAITING"}
                </p>
                <p className="mt-6 text-7xl font-black text-cyan-300">
                  {match.scoreA}
                </p>
              </div>

              <div className="text-center text-3xl font-black text-white/40">
                VS
              </div>

              <div className="rounded-3xl border border-violet-400/40 bg-violet-400/10 p-8 text-center">
                <h2 className="text-3xl font-black">{teamBName}</h2>
                <p className="mt-3 text-white/50">Team B</p>
                <p
                  className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    match.teamBCheckedInAt
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/10 text-white/45"
                  }`}
                >
                  {match.teamBCheckedInAt ? "CHECKED IN" : "WAITING"}
                </p>
                <p className="mt-6 text-7xl font-black text-violet-300">
                  {match.scoreB}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-black/30 p-5">
                <Clock className="mb-3 text-cyan-400" />
                <p className="text-sm text-white/50">Scheduled</p>
                <p className="font-black">
                  {match.scheduledAt
                    ? new Date(match.scheduledAt).toLocaleString()
                    : "TBA"}
                </p>
              </div>

              <div className="rounded-3xl bg-black/30 p-5">
                <Video className="mb-3 text-violet-400" />
                <p className="text-sm text-white/50">Stream</p>
                {match.status === "IN_PROGRESS" && match.livestreamUrl ? (
                  <a
                    href={match.livestreamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-xl bg-red-400 px-3 py-2 text-sm font-black text-black hover:bg-red-300"
                  >
                    Watch Live
                  </a>
                ) : (
                  <p className="font-black">{match.livestreamUrl ?? "TBA"}</p>
                )}
              </div>

              <div className="rounded-3xl bg-black/30 p-5">
                <Radio className="mb-3 text-amber-300" />
                <p className="text-sm text-white/50">Room Code</p>
                <p className="font-black">{match.roomCode ?? "TBA"}</p>
              </div>

              <div className="rounded-3xl bg-black/30 p-5">
                <CheckCircle2 className="mb-3 text-green-400" />
                <p className="text-sm text-white/50">Winner</p>
                <p className="font-black">{winnerName}</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="font-black">Captain Check-in</p>
                  <p className="mt-1 text-sm text-white/55">
                    Match becomes READY after both captains check in.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={
                      loadingAction === "check-in" ||
                      match.status === "READY" ||
                      match.status === "IN_PROGRESS" ||
                      match.status === "PENDING_CONFIRMATION" ||
                      match.status === "DISPUTED" ||
                      match.status === "COMPLETED" ||
                      match.status === "CANCELLED"
                    }
                    className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-black hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {loadingAction === "check-in" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Check in
                  </button>

                  <button
                    type="button"
                    onClick={handleStartMatch}
                    disabled={loadingAction === "start" || match.status !== "READY"}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {loadingAction === "start" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Radio size={18} />
                    )}
                    Start Match
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black">Submit Result</h2>

              {match.status === "IN_PROGRESS" ? (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={scoreA}
                      onChange={(event) => setScoreA(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                      placeholder="Team A score"
                    />
                    <input
                      type="number"
                      value={scoreB}
                      onChange={(event) => setScoreB(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                      placeholder="Team B score"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setResultEvidenceFile(event.target.files?.[0] ?? null)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-black file:text-black"
                    />
                    <input
                      value={evidenceNote}
                      onChange={(event) => setEvidenceNote(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                      placeholder="Evidence note"
                    />
                  </div>

                  <button
                    onClick={handleSubmitResult}
                    disabled={loadingAction === "score"}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {loadingAction === "score" && (
                      <Loader2 size={18} className="animate-spin" />
                    )}
                    Submit for Confirmation
                  </button>
                </>
              ) : (
                <p className="mt-5 rounded-2xl bg-black/30 p-4 text-sm text-white/55">
                  Result submission opens when the match is IN_PROGRESS.
                </p>
              )}
            </div>

            {isPendingConfirmation && (
              <div className="rounded-[2rem] border border-amber-300/25 bg-amber-300/10 p-6">
                <Clock className="mb-4 text-amber-200" />
                <h2 className="text-2xl font-black">Pending Confirmation</h2>

                <div className="mt-5 rounded-3xl bg-black/30 p-5 text-center">
                  <p className="text-sm text-white/50">
                    Submitted by {resultSubmittedSlot}
                  </p>
                  <p className="mt-2 text-5xl font-black text-amber-200">
                    {match.pendingScoreA ?? 0} - {match.pendingScoreB ?? 0}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    {match.resultSubmittedAt
                      ? new Date(match.resultSubmittedAt).toLocaleString()
                      : "Awaiting review"}
                  </p>
                </div>

                {pendingEvidence && (
                  <a
                    href={pendingEvidence.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-cyan-200 hover:bg-white/10"
                  >
                    <Upload size={18} />
                    View Submitted Evidence
                  </a>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleConfirmResult}
                    disabled={loadingAction === "confirm-result"}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-black hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {loadingAction === "confirm-result" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={handleDisputeResult}
                    disabled={loadingAction === "dispute"}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-400 px-5 py-3 font-bold text-black hover:bg-red-300 disabled:opacity-50"
                  >
                    {loadingAction === "dispute" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                    Dispute
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black">Evidence Archive</h2>

              <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <p className="font-black">Upload Evidence</p>
                <div className="mt-3 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setArchiveEvidenceFile(event.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-black file:text-black"
                  />
                  <input
                    value={archiveEvidenceNote}
                    onChange={(event) =>
                      setArchiveEvidenceNote(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                    placeholder="Evidence note"
                  />
                  <button
                    type="button"
                    onClick={handleUploadEvidence}
                    disabled={loadingAction === "upload-evidence"}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {loadingAction === "upload-evidence" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    Upload Evidence
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {evidences.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Upload}
                    title="No evidence uploaded"
                    description="Screenshots and supporting notes will appear here."
                  />
                ) : (
                  evidences.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-black/30 p-4">
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-cyan-300"
                      >
                        Evidence image
                      </a>
                      <p className="mt-1 text-sm text-white/50">
                        {item.note ?? "No note"} - {item.submittedBy}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
              <AlertTriangle className="mb-4 text-red-300" />
              <h2 className="text-2xl font-black">Dispute Center</h2>

              <input
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                placeholder="Reason"
              />

              {isPendingConfirmation && (
                <div className="mt-3 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setDisputeEvidenceFile(event.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-red-400 file:px-3 file:py-2 file:font-black file:text-black"
                  />
                  <input
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                    placeholder="Evidence note"
                  />
                </div>
              )}

              <button
                onClick={handleDisputeResult}
                disabled={loadingAction === "dispute" || !isPendingConfirmation}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-400 px-5 py-3 font-bold text-black hover:bg-red-300 disabled:opacity-50"
              >
                {loadingAction === "dispute" && (
                  <Loader2 size={18} className="animate-spin" />
                )}
                Dispute Pending Result
              </button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
