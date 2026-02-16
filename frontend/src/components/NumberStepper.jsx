import React, { useState } from 'react';
import clsx from 'clsx';

export default function NumberStepper({
	value = 1,
	onChange,
	min = 1,
	max = 9999,
	disabled = false,
}) {
	const [inputValue, setInputValue] = useState(String(value));

	React.useEffect(() => {
		setInputValue(String(value));
	}, [value]);

	const dec = () => {
		if (disabled) return;
		const newVal = Math.max(min, value - 1);
		onChange(newVal);
	};

	const inc = () => {
		if (disabled) return;
		const newVal = Math.min(max, value + 1);
		onChange(newVal);
	};

	function handleInputChange(e) {
		const v = e.target.value;

		if (v === '') {
			setInputValue('');
			return;
		}

		if (!/^\d+$/.test(v)) return;

		setInputValue(v);

		const num = Number(v);
		if (!isNaN(num)) {
			onChange(Math.min(Math.max(num, min), max));
		}
	}

	function handleBlur() {
		if (inputValue === '') {
			setInputValue(String(min));
			onChange(min);
		}
	}

	return (
		<div
			className={clsx(
				'inline-flex items-center border rounded-md overflow-hidden text-sm h-[40px] select-none',
				disabled ? 'opacity-40 cursor-not-allowed' : '',
			)}>
			<button
				type="button"
				onClick={dec}
				disabled={disabled}
				className={clsx(
					'px-3 py-1 text-lg leading-none font-medium',
					'text-primary opacity-80',
					disabled && 'pointer-events-none',
				)}>
				–
			</button>

			<input
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				disabled={disabled}
				className={clsx(
					'w-[60px] text-center outline-none',
					'text-gray-800 text-sm py-1',
					disabled && 'bg-gray-100',
				)}
			/>

			<button
				type="button"
				onClick={inc}
				disabled={disabled}
				className={clsx(
					'px-3 py-1 text-lg leading-none font-medium',
					'text-primary opacity-80',
					disabled && 'pointer-events-none',
				)}>
				+
			</button>
		</div>
	);
}
