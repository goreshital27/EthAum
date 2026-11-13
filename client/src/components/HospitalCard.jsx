import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Video, ShieldCheck, Scale, Check } from 'lucide-react';
import { formatCentsToUSD } from '../utils/currency';
import { useCompare } from '../context/CompareContext';

export default function HospitalCard({ hospital }) {
  const formattedPrice = formatCentsToUSD(hospital.fromPriceCents);
  const { isComparing, toggleHospital, canAddMore } = useCompare();

  const comparing = isComparing(hospital.slug);

  const handleCompareClick = (e) => {
    e.stopPropagation();
    toggleHospital({ slug: hospital.slug, name: hospital.name });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
      <div className="p-5 space-y-3.5">
        {/* Top Badges & Compare Toggle */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            {hospital.offersVirtualConsult && (
              <span
                title="Virtual consultations available"
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200"
              >
                <Video className="h-3 w-3 mr-1" />
                Telehealth
              </span>
            )}
          </div>

          {/* Add to Compare Checkbox Button */}
          <button
            type="button"
            onClick={handleCompareClick}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              comparing
                ? 'bg-teal-700 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title={comparing ? 'Remove from comparison' : canAddMore ? 'Add to compare' : 'Comparison limit reached (max 3)'}
          >
            {comparing ? (
              <>
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>Comparing</span>
              </>
            ) : (
              <>
                <Scale className="h-3 w-3 text-slate-400" />
                <span>Add to compare</span>
              </>
            )}
          </button>
        </div>

        {/* Title and Location */}
        <div>
          <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-2">
            <Link
              to={`/hospitals/${hospital.slug}`}
              className="hover:text-teal-700 transition-colors"
            >
              {hospital.name}
            </Link>
          </h3>
          <div className="flex items-center text-xs text-slate-500 mt-1 space-x-1">
            <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>
              {hospital.city}, {hospital.country}
            </span>
          </div>
        </div>

        {/* Accreditations tags */}
        {hospital.accreditations && hospital.accreditations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {hospital.accreditations.map((acc) => (
              <span
                key={acc}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700"
              >
                <ShieldCheck className="h-3 w-3 mr-1 text-teal-600" />
                {acc}
              </span>
            ))}
          </div>
        )}

        {/* Specialties tags */}
        {hospital.specialties && hospital.specialties.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Specialties
            </p>
            <div className="flex flex-wrap gap-1">
              {hospital.specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="px-2 py-0.5 rounded-full text-xs bg-slate-50 text-slate-600 border border-slate-200"
                >
                  {spec}
                </span>
              ))}
              {hospital.specialties.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs text-slate-400">
                  +{hospital.specialties.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: Rating, Price, and Coral "Get a Quote" Button */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between gap-3">
        <div>
          {hospital.reviewCount > 0 ? (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-900">
                {hospital.averageRating}
              </span>
              <span className="text-xs text-slate-500">
                ({hospital.reviewCount})
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">New facility</span>
          )}

          <div className="mt-0.5">
            {formattedPrice ? (
              <span className="text-xs text-slate-600">
                From <span className="font-bold text-slate-900 text-sm">{formattedPrice}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">Custom packages</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/hospitals/${hospital.slug}`}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            Profile
          </Link>

          {/* ONE Coral "Get a Quote" Button */}
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-sm transition-colors shrink-0"
          >
            Get a Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
