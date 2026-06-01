import type { MeetingMetadata } from "../domain/meeting";
import { MOM_TEMPLATES } from "../utils/linkIntake";

interface MetadataFormProps {
  value: Omit<MeetingMetadata, "sourceType">;
  onChange: (value: Omit<MeetingMetadata, "sourceType">) => void;
}

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  const update = (field: keyof Omit<MeetingMetadata, "sourceType">, next: string) => {
    onChange({ ...value, [field]: next });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block font-medium">Meeting title</span>
        <input className="w-full rounded border p-2" value={value.title} onChange={(e) => update("title", e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Client/project</span>
        <input
          className="w-full rounded border p-2"
          value={value.clientProject}
          onChange={(e) => update("clientProject", e.target.value)}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Meeting date</span>
        <input
          type="date"
          className="w-full rounded border p-2"
          value={value.meetingDate}
          onChange={(e) => update("meetingDate", e.target.value)}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Meeting type</span>
        <select className="w-full rounded border p-2" value={value.meetingType} onChange={(e) => update("meetingType", e.target.value)}>
          <option value="Status Review">Status Review</option>
          <option value="Client Escalation">Client Escalation</option>
          <option value="Internal Sync">Internal Sync</option>
          <option value="Discovery">Discovery</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Platform</span>
        <select className="w-full rounded border p-2" value={value.platform} onChange={(e) => update("platform", e.target.value)}>
          <option value="Webex">Webex</option>
          <option value="Zoom">Zoom</option>
          <option value="Microsoft Teams">Microsoft Teams</option>
          <option value="Google Meet">Google Meet</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Shared by</span>
        <input className="w-full rounded border p-2" value={value.sharedBy} onChange={(e) => update("sharedBy", e.target.value)} />
      </label>
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium">Intelligence template</span>
        <select className="w-full rounded border p-2" value={value.momTemplate} onChange={(e) => update("momTemplate", e.target.value)}>
          {MOM_TEMPLATES.map((template) => (
            <option key={template.value} value={template.value}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
