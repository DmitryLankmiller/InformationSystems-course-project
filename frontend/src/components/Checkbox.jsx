export default function Checkbox({ checked, onChange, label }) {
	return (
		<label className="flex items-start gap-2 cursor-pointer select-none text-sm text-gray-800">
			<input
				type="checkbox"
				className="mt-[3px] w-4 h-4 border rounded-sm text-primary accent-primary"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span>{label}</span>
		</label>
	);
}
